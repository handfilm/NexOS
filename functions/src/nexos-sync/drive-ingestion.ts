import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { google } from 'googleapis';
import { publishRawProductEvent } from './pubsub-client';
import { RawProductEvent, DriveSyncState } from './types';
import { NexosLogger } from './logger';

const logger = new NexosLogger('DriveIngestion');

function getDb(): admin.firestore.Firestore {
  return admin.firestore();
}

/**
 * Initializes authenticated Google Drive v3 client.
 * Uses service account credentials from GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY secret (JSON),
 * or falls back to Google Application Default Credentials (ADC) if running inside GCP.
 */
function getDriveClient() {
  const serviceAccountJson = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY;
  let auth: any;

  if (serviceAccountJson) {
    try {
      const credentials = JSON.parse(serviceAccountJson);
      auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
    } catch (parseErr) {
      logger.error('Failed to parse GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY secret', parseErr);
      auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
    }
  } else {
    auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
  }

  return google.drive({ version: 'v3', auth });
}

/**
 * Cloud Scheduler 2nd-Gen Function: Runs every 10 minutes.
 * Polls Google Drive changes.list() for modified product JSON files
 * inside shop.handsandhead.com's dedicated Google Drive folder.
 */
export const pollShopDriveChanges = onSchedule(
  {
    schedule: 'every 10 minutes',
    timeZone: 'Asia/Dhaka',
    region: 'asia-east1',
    memory: '512MiB',
    timeoutSeconds: 300,
    secrets: ['GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY', 'RAW_PRODUCT_EVENTS_TOPIC'],
  },
  async () => {
    logger.info('Initiating scheduled Google Drive changes polling for shop.handsandhead.com', {
      action: 'POLL_START',
    });

    const targetFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || 'shop_handsandhead_catalog_root';
    const db = getDb();
    const syncDocRef = db.collection('system_sync').doc('shop_handsandhead_drive');

    let syncState: DriveSyncState = {
      startPageToken: '',
      lastSuccessfulSync: new Date().toISOString(),
      filesProcessedTotal: 0,
      status: 'SYNCING',
    };

    try {
      const syncDocSnap = await syncDocRef.get();
      if (syncDocSnap.exists) {
        syncState = syncDocSnap.data() as DriveSyncState;
      }

      const drive = getDriveClient();

      // If no startPageToken exists, obtain the baseline token from Google Drive
      let pageToken = syncState.startPageToken;
      if (!pageToken) {
        logger.notice('No existing startPageToken found in Firestore. Fetching initial token from Drive API.', {
          action: 'FETCH_INITIAL_TOKEN',
        });
        const tokenRes = await drive.changes.getStartPageToken({
          supportsAllDrives: true,
        });
        pageToken = tokenRes.data.startPageToken || '';

        if (!pageToken) {
          throw new Error('Google Drive API returned empty startPageToken');
        }

        await syncDocRef.set({
          startPageToken: pageToken,
          lastSuccessfulSync: admin.firestore.FieldValue.serverTimestamp(),
          filesProcessedTotal: 0,
          status: 'IDLE',
        }, { merge: true });

        logger.info('Initial startPageToken stored. Ready for next scheduled delta cycle.', {
          metadata: { pageToken },
        });
        return;
      }

      let newStartPageToken: string | null = null;
      let hasMore = true;
      let cycleProcessedCount = 0;

      while (hasMore && pageToken) {
        const changesRes = await drive.changes.list({
          pageToken,
          spaces: 'drive',
          includeItemsFromAllDrives: true,
          supportsAllDrives: true,
          fields: 'nextPageToken, newStartPageToken, changes(fileId, removed, file(id, name, mimeType, parents, trashed, modifiedTime))',
        });

        const changes = changesRes.data.changes || [];
        logger.info(`Fetched ${changes.length} change record(s) from Drive API`, {
          metadata: { pageToken, changesCount: changes.length },
        });

        for (const change of changes) {
          if (change.removed || change.file?.trashed) {
            logger.debug(`Skipping removed/trashed file ID: ${change.fileId}`);
            continue;
          }

          const file = change.file;
          if (!file || !file.id) continue;

          // Verify if file is inside target folder hierarchy (if targetFolderId is configured)
          const parents = file.parents || [];
          const isInTargetFolder = targetFolderId === 'shop_handsandhead_catalog_root' || parents.includes(targetFolderId);

          const isJson = (file.name && file.name.toLowerCase().endsWith('.json')) ||
            file.mimeType === 'application/json';

          if (isJson && isInTargetFolder) {
            try {
              logger.info(`Processing updated JSON file: ${file.name} (ID: ${file.id})`, {
                action: 'DOWNLOAD_FILE',
                metadata: { fileId: file.id },
              });

              // Stream file content as JSON
              const fileRes = await drive.files.get(
                { fileId: file.id, alt: 'media', supportsAllDrives: true },
                { responseType: 'json' }
              );

              const rawContent = fileRes.data;
              const itemsToPublish: any[] = Array.isArray(rawContent) ? rawContent : [rawContent];

              for (const [idx, item] of itemsToPublish.entries()) {
                const eventId = `drive_${file.id}_${Date.now()}_${idx}`;
                const event: RawProductEvent = {
                  eventId,
                  origin: 'shop.handsandhead.com',
                  sourceType: 'google_drive',
                  timestamp: new Date().toISOString(),
                  fileId: file.id,
                  fileName: file.name || 'unnamed.json',
                  rawPayload: item,
                };

                await publishRawProductEvent(event);
                cycleProcessedCount++;
              }
            } catch (fileErr) {
              logger.error(`Error downloading/parsing Drive file ${file.id}`, fileErr, {
                metadata: { fileId: file.id, fileName: file.name },
              });
            }
          }
        }

        if (changesRes.data.nextPageToken) {
          pageToken = changesRes.data.nextPageToken;
        } else {
          hasMore = false;
          newStartPageToken = changesRes.data.newStartPageToken || null;
        }
      }

      // Update cursor token in Firestore
      const updatedToken = newStartPageToken || pageToken;
      await syncDocRef.set({
        startPageToken: updatedToken,
        lastSuccessfulSync: admin.firestore.FieldValue.serverTimestamp(),
        filesProcessedTotal: (syncState.filesProcessedTotal || 0) + cycleProcessedCount,
        status: 'IDLE',
        lastError: null,
      }, { merge: true });

      logger.info('Drive polling completed successfully', {
        action: 'POLL_COMPLETE',
        metadata: {
          processedThisCycle: cycleProcessedCount,
          nextToken: updatedToken,
        },
      });
    } catch (err: any) {
      logger.error('Fatal error during Google Drive change polling', err, {
        action: 'POLL_FATAL',
      });

      await syncDocRef.set({
        status: 'ERROR',
        lastError: err.message || String(err),
        lastFailedSync: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      throw err;
    }
  }
);

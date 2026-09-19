"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollShopDriveChanges = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const googleapis_1 = require("googleapis");
const pubsub_client_1 = require("./pubsub-client");
const logger_1 = require("./logger");
const logger = new logger_1.NexosLogger('DriveIngestion');
function getDb() {
    return admin.firestore();
}
/**
 * Initializes authenticated Google Drive v3 client.
 * Uses service account credentials from GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY secret (JSON),
 * or falls back to Google Application Default Credentials (ADC) if running inside GCP.
 */
function getDriveClient() {
    const serviceAccountJson = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY;
    let auth;
    if (serviceAccountJson) {
        try {
            const credentials = JSON.parse(serviceAccountJson);
            auth = new googleapis_1.google.auth.JWT({
                email: credentials.client_email,
                key: credentials.private_key,
                scopes: ['https://www.googleapis.com/auth/drive.readonly'],
            });
        }
        catch (parseErr) {
            logger.error('Failed to parse GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY secret', parseErr);
            auth = new googleapis_1.google.auth.GoogleAuth({
                scopes: ['https://www.googleapis.com/auth/drive.readonly'],
            });
        }
    }
    else {
        auth = new googleapis_1.google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });
    }
    return googleapis_1.google.drive({ version: 'v3', auth });
}
/**
 * Cloud Scheduler 2nd-Gen Function: Runs every 10 minutes.
 * Polls Google Drive changes.list() for modified product JSON files
 * inside shop.handsandhead.com's dedicated Google Drive folder.
 */
exports.pollShopDriveChanges = (0, scheduler_1.onSchedule)({
    schedule: 'every 10 minutes',
    timeZone: 'Asia/Dhaka',
    region: 'asia-east1',
    memory: '512MiB',
    timeoutSeconds: 300,
    secrets: ['GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY', 'RAW_PRODUCT_EVENTS_TOPIC'],
}, async () => {
    logger.info('Initiating scheduled Google Drive changes polling for shop.handsandhead.com', {
        action: 'POLL_START',
    });
    const targetFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || 'shop_handsandhead_catalog_root';
    const db = getDb();
    const syncDocRef = db.collection('system_sync').doc('shop_handsandhead_drive');
    let syncState = {
        startPageToken: '',
        lastSuccessfulSync: new Date().toISOString(),
        filesProcessedTotal: 0,
        status: 'SYNCING',
    };
    try {
        const syncDocSnap = await syncDocRef.get();
        if (syncDocSnap.exists) {
            syncState = syncDocSnap.data();
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
        let newStartPageToken = null;
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
                if (!file || !file.id)
                    continue;
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
                        const fileRes = await drive.files.get({ fileId: file.id, alt: 'media', supportsAllDrives: true }, { responseType: 'json' });
                        const rawContent = fileRes.data;
                        const itemsToPublish = Array.isArray(rawContent) ? rawContent : [rawContent];
                        for (const [idx, item] of itemsToPublish.entries()) {
                            const eventId = `drive_${file.id}_${Date.now()}_${idx}`;
                            const event = {
                                eventId,
                                origin: 'shop.handsandhead.com',
                                sourceType: 'google_drive',
                                timestamp: new Date().toISOString(),
                                fileId: file.id,
                                fileName: file.name || 'unnamed.json',
                                rawPayload: item,
                            };
                            await (0, pubsub_client_1.publishRawProductEvent)(event);
                            cycleProcessedCount++;
                        }
                    }
                    catch (fileErr) {
                        logger.error(`Error downloading/parsing Drive file ${file.id}`, fileErr, {
                            metadata: { fileId: file.id, fileName: file.name },
                        });
                    }
                }
            }
            if (changesRes.data.nextPageToken) {
                pageToken = changesRes.data.nextPageToken;
            }
            else {
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
    }
    catch (err) {
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
});
//# sourceMappingURL=drive-ingestion.js.map
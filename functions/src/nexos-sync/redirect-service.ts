import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { NexosLogger } from './logger';

const logger = new NexosLogger('CatalogRedirect');

function getDb(): admin.firestore.Firestore {
  return admin.firestore();
}

/**
 * HTTP 2nd-Gen Cloud Function: Secure Origin Redirector
 * Resolves /api/redirect/:catalogId -> 302 Redirect with ?ref=b2b
 * 
 * Guarantees that internal/raw D2C URLs (storefront permalinks, private drive folders)
 * are NEVER bundled into the client React code or leaked in public DOM links.
 */
export const catalogRedirect = onRequest(
  {
    region: 'asia-east1',
    cors: true,
    maxInstances: 25,
  },
  async (req, res) => {
    // Extract catalog ID from path or query parameter
    // Handles /api/redirect/:catalogId, /catalogRedirect/:catalogId, or ?id=:catalogId
    let catalogId = '';

    if (req.query.id && typeof req.query.id === 'string') {
      catalogId = req.query.id.trim();
    } else if (req.query.catalogId && typeof req.query.catalogId === 'string') {
      catalogId = req.query.catalogId.trim();
    } else {
      const cleanPath = req.path.replace(/^\/api\/redirect\/?/, '').replace(/^\/catalogRedirect\/?/, '').replace(/^\//, '');
      catalogId = cleanPath.split('/')[0] || '';
    }

    if (!catalogId) {
      res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Invalid Catalog Redirect</title></head>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h2 style="color: #c2410c;">NEXOS B2B Redirect Service</h2>
            <p>Missing required catalog identifier in redirect request.</p>
          </body>
        </html>
      `);
      return;
    }

    const db = getDb();

    try {
      // Step 1: Look up private metadata record (stores genuine source URL)
      const privateSnap = await db.collection('federated_catalog_private').doc(catalogId).get();
      let destinationUrl = '';

      if (privateSnap.exists) {
        const data = privateSnap.data() || {};
        destinationUrl = data.privateSourceUrl || '';
      }

      // Step 2: Fallback lookup on public document if private metadata not populated
      if (!destinationUrl) {
        const publicSnap = await db.collection('federated_catalog').doc(catalogId).get();
        if (publicSnap.exists) {
          const pubData = publicSnap.data() || {};
          if (pubData.origin === 'arutemika.com') {
            destinationUrl = `https://arutemika.com/products/${pubData.handle || pubData.sku}`;
          } else {
            destinationUrl = `https://shop.handsandhead.com/products/${pubData.handle || pubData.sku}`;
          }
        }
      }

      if (!destinationUrl) {
        logger.warn(`Catalog redirect destination not found for: ${catalogId}`, {
          catalogId,
          action: 'REDIRECT_NOT_FOUND',
        });
        res.status(404).send(`
          <!DOCTYPE html>
          <html>
            <head><title>Product Not Found — Hands & Head</title></head>
            <body style="font-family: sans-serif; padding: 40px; text-align: center;">
              <h2 style="color: #0f172a;">Hands & Head Federated Catalog</h2>
              <p>Requested product reference "<strong>${catalogId}</strong>" was not found in the federated exchange.</p>
              <a href="https://b2b.handsandhead.com" style="color: #0284c7; text-decoration: underline;">Return to B2B Catalog</a>
            </body>
          </html>
        `);
        return;
      }

      // Step 3: Append ?ref=b2b attribution parameters securely
      const parsedUrl = new URL(destinationUrl);
      parsedUrl.searchParams.set('ref', 'b2b');
      parsedUrl.searchParams.set('source', 'nexos_federated');
      parsedUrl.searchParams.set('utm_source', 'b2b.handsandhead.com');
      parsedUrl.searchParams.set('utm_medium', 'wholesale_federated_referral');

      const finalRedirectUrl = parsedUrl.toString();

      logger.info(`Routing secure 302 redirect for catalog item ${catalogId}`, {
        catalogId,
        action: 'REDIRECT_ISSUED',
        metadata: {
          clientIp: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      // Prevent caching of redirect so inventory/routing changes take effect immediately
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.redirect(302, finalRedirectUrl);
    } catch (err: any) {
      logger.error(`Internal error resolving redirect for ${catalogId}`, err, {
        catalogId,
        action: 'REDIRECT_ERROR',
      });
      res.status(500).send('Internal Redirect Resolution Error');
    }
  }
);

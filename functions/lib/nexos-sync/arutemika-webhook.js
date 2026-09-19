"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arutemikaWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const pubsub_client_1 = require("./pubsub-client");
const logger_1 = require("./logger");
const logger = new logger_1.NexosLogger('ArutemikaWebhook');
/**
 * HTTP 2nd-Gen Cloud Function: Webhook Ingestion for arutemika.com
 * Receives real-time product updates from Arutemika D2C leather storefront.
 * Authenticates request via x-arutemika-api-key header against secret ARUTEMIKA_WEBHOOK_SECRET.
 * Normalizes event envelope and pushes message to Pub/Sub topic `raw-product-events`.
 */
exports.arutemikaWebhook = (0, https_1.onRequest)({
    region: 'asia-east1',
    cors: true,
    maxInstances: 20,
    secrets: ['ARUTEMIKA_WEBHOOK_SECRET', 'RAW_PRODUCT_EVENTS_TOPIC'],
}, async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
        res.status(405).json({
            error: 'Method Not Allowed',
            message: 'Arutemika webhook endpoint only accepts HTTP POST payloads.',
        });
        return;
    }
    // Authenticate Webhook Caller
    const expectedSecret = process.env.ARUTEMIKA_WEBHOOK_SECRET;
    const providedApiKey = req.headers['x-arutemika-api-key'] ||
        req.headers['x-api-key'] ||
        req.headers['authorization']?.replace(/^Bearer\s+/i, '');
    if (!expectedSecret || providedApiKey !== expectedSecret) {
        logger.warn('Unauthorized webhook invocation attempt on arutemikaWebhook', {
            action: 'AUTH_FAILURE',
            metadata: {
                clientIp: req.ip,
                hasProvidedHeader: Boolean(providedApiKey),
            },
        });
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or missing Arutemika API key authentication header.',
        });
        return;
    }
    const body = req.body;
    if (!body || typeof body !== 'object') {
        res.status(400).json({
            error: 'Bad Request',
            message: 'Request body must be a valid JSON object or array of product records.',
        });
        return;
    }
    const incomingProducts = Array.isArray(body)
        ? body
        : Array.isArray(body.products)
            ? body.products
            : [body];
    if (incomingProducts.length === 0) {
        res.status(400).json({
            error: 'Bad Request',
            message: 'No product records found in incoming payload.',
        });
        return;
    }
    logger.info(`Received ${incomingProducts.length} product(s) from arutemika.com webhook`, {
        action: 'RECEIVE_WEBHOOK',
        metadata: { count: incomingProducts.length },
    });
    const publishedResults = [];
    const errors = [];
    for (const [index, rawProduct] of incomingProducts.entries()) {
        const skuOrId = rawProduct.sku || rawProduct.product_id || rawProduct.article_number || `item_${index}`;
        const eventId = `arutemika_${skuOrId}_${Date.now()}`;
        const event = {
            eventId,
            origin: 'arutemika.com',
            sourceType: 'webhook',
            timestamp: new Date().toISOString(),
            rawPayload: rawProduct,
        };
        try {
            const publishResult = await (0, pubsub_client_1.publishRawProductEvent)(event);
            publishedResults.push({
                skuOrId,
                eventId,
                messageId: publishResult.messageId,
                dlq: publishResult.routedToDlq,
            });
        }
        catch (err) {
            logger.error(`Failed to publish product ${skuOrId} to Pub/Sub`, err, {
                eventId,
                origin: 'arutemika.com',
            });
            errors.push({
                skuOrId,
                error: err.message || String(err),
            });
        }
    }
    const statusCode = errors.length > 0 && publishedResults.length === 0 ? 502 : 202;
    res.status(statusCode).json({
        status: statusCode === 202 ? 'ACCEPTED' : 'PARTIAL_OR_FAILED',
        message: `Enqueued ${publishedResults.length} of ${incomingProducts.length} product events into NEXOS Raw Event Queue.`,
        enqueued: publishedResults,
        failures: errors,
        timestamp: new Date().toISOString(),
    });
});
//# sourceMappingURL=arutemika-webhook.js.map
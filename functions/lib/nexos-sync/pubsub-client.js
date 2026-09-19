"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishRawProductEvent = publishRawProductEvent;
const pubsub_1 = require("@google-cloud/pubsub");
const logger_1 = require("./logger");
const logger = new logger_1.NexosLogger('PubSubPublisher');
const PRIMARY_TOPIC_NAME = process.env.RAW_PRODUCT_EVENTS_TOPIC || 'raw-product-events';
const DLQ_TOPIC_NAME = process.env.RAW_PRODUCT_EVENTS_DLQ_TOPIC || 'raw-product-events-dlq';
let pubSubClient = null;
let primaryTopic = null;
let dlqTopic = null;
function getPubSub() {
    if (!pubSubClient) {
        pubSubClient = new pubsub_1.PubSub({
            projectId: process.env.GCLOUD_PROJECT || process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG || '{}').projectId : undefined,
        });
        primaryTopic = pubSubClient.topic(PRIMARY_TOPIC_NAME);
        dlqTopic = pubSubClient.topic(DLQ_TOPIC_NAME);
    }
    return { client: pubSubClient, primary: primaryTopic, dlq: dlqTopic };
}
/**
 * Publishes raw product events to `raw-product-events`.
 * If publication to the primary topic fails after retries, routes the event
 * directly to the Dead Letter Queue topic (`raw-product-events-dlq`) with full diagnostic metadata.
 */
async function publishRawProductEvent(event) {
    const { primary, dlq } = getPubSub();
    const dataBuffer = Buffer.from(JSON.stringify(event));
    const attributes = {
        origin: event.origin,
        sourceType: event.sourceType,
        eventId: event.eventId,
        timestamp: event.timestamp,
    };
    if (event.fileId) {
        attributes.fileId = event.fileId;
    }
    try {
        const messageId = await primary.publishMessage({
            data: dataBuffer,
            attributes,
        });
        logger.info('Raw product event published successfully to primary topic', {
            action: 'PUBLISH_PRIMARY_SUCCESS',
            eventId: event.eventId,
            origin: event.origin,
            metadata: { messageId, topic: PRIMARY_TOPIC_NAME },
        });
        return { messageId, routedToDlq: false };
    }
    catch (primaryErr) {
        logger.error('Failed to publish event to primary topic. Rerouting to DLQ topic.', primaryErr, {
            action: 'PUBLISH_PRIMARY_FAILED',
            eventId: event.eventId,
            origin: event.origin,
        });
        try {
            const dlqAttributes = {
                ...attributes,
                failureReason: primaryErr instanceof Error ? primaryErr.message : String(primaryErr),
                reroutedAt: new Date().toISOString(),
            };
            const dlqMessageId = await dlq.publishMessage({
                data: dataBuffer,
                attributes: dlqAttributes,
            });
            logger.warn('Event successfully published to Dead Letter Queue (DLQ)', {
                action: 'PUBLISH_DLQ_SUCCESS',
                eventId: event.eventId,
                origin: event.origin,
                metadata: { dlqMessageId, topic: DLQ_TOPIC_NAME },
            });
            return { messageId: dlqMessageId, routedToDlq: true };
        }
        catch (dlqErr) {
            logger.critical('CRITICAL: Failed to publish event to both primary and DLQ topics', dlqErr, {
                action: 'PUBLISH_ALL_FAILED',
                eventId: event.eventId,
                origin: event.origin,
            });
            throw new Error(`PubSub publishing failed: primary(${primaryErr}) dlq(${dlqErr})`);
        }
    }
}
//# sourceMappingURL=pubsub-client.js.map
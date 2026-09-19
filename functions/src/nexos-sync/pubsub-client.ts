import { PubSub, Topic } from '@google-cloud/pubsub';
import { RawProductEvent } from './types';
import { NexosLogger } from './logger';

const logger = new NexosLogger('PubSubPublisher');

const PRIMARY_TOPIC_NAME = process.env.RAW_PRODUCT_EVENTS_TOPIC || 'raw-product-events';
const DLQ_TOPIC_NAME = process.env.RAW_PRODUCT_EVENTS_DLQ_TOPIC || 'raw-product-events-dlq';

let pubSubClient: PubSub | null = null;
let primaryTopic: Topic | null = null;
let dlqTopic: Topic | null = null;

function getPubSub(): { client: PubSub; primary: Topic; dlq: Topic } {
  if (!pubSubClient) {
    pubSubClient = new PubSub({
      projectId: process.env.GCLOUD_PROJECT || process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG || '{}').projectId : undefined,
    });
    primaryTopic = pubSubClient.topic(PRIMARY_TOPIC_NAME);
    dlqTopic = pubSubClient.topic(DLQ_TOPIC_NAME);
  }
  return { client: pubSubClient, primary: primaryTopic!, dlq: dlqTopic! };
}

/**
 * Publishes raw product events to `raw-product-events`.
 * If publication to the primary topic fails after retries, routes the event
 * directly to the Dead Letter Queue topic (`raw-product-events-dlq`) with full diagnostic metadata.
 */
export async function publishRawProductEvent(event: RawProductEvent): Promise<{ messageId: string; routedToDlq: boolean }> {
  const { primary, dlq } = getPubSub();
  const dataBuffer = Buffer.from(JSON.stringify(event));

  const attributes: Record<string, string> = {
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
  } catch (primaryErr) {
    logger.error('Failed to publish event to primary topic. Rerouting to DLQ topic.', primaryErr, {
      action: 'PUBLISH_PRIMARY_FAILED',
      eventId: event.eventId,
      origin: event.origin,
    });

    try {
      const dlqAttributes: Record<string, string> = {
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
    } catch (dlqErr) {
      logger.critical('CRITICAL: Failed to publish event to both primary and DLQ topics', dlqErr, {
        action: 'PUBLISH_ALL_FAILED',
        eventId: event.eventId,
        origin: event.origin,
      });
      throw new Error(`PubSub publishing failed: primary(${primaryErr}) dlq(${dlqErr})`);
    }
  }
}

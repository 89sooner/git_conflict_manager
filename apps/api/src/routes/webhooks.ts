import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { DataEnvelope } from '@gsp/shared-types';
import { verifyGitHubSignature } from '../lib/github/verify.js';
import { normalizeWebhookEvent, deriveSyncJobs } from '../lib/github/normalizer.js';
import { SUPPORTED_WEBHOOK_EVENTS } from '../lib/github/types.js';
import { SyncJobQueue } from '../lib/sync/queue.js';
import { ApiError } from '../lib/errors.js';

export interface WebhookRouteOptions {
  /**
   * GitHub App webhook secret.
   * When empty, signature verification is SKIPPED.
   * Always set in production — only leave empty in tests that explicitly
   * want to bypass verification.
   */
  webhookSecret: string;
}

interface WebhookAcceptedData {
  deliveryId: string;
  eventName: string;
  action: string | null;
  status: 'accepted' | 'duplicate' | 'ignored';
  syncJobsEnqueued: number;
}

/**
 * In-process delivery-id dedup set.
 * Provides within-instance idempotency until the DB upsert path is wired.
 * Per integration_webhook_events.delivery_id unique constraint, DB-level
 * dedup will take over once pg connectivity is added.
 */
const seenDeliveryIds = new Set<string>();

// Limit in-memory set growth (simple FIFO eviction after threshold)
const MAX_SEEN = 10_000;
const seenQueue: string[] = [];

function recordDeliveryId(id: string): boolean {
  if (seenDeliveryIds.has(id)) return false;
  seenDeliveryIds.add(id);
  seenQueue.push(id);
  if (seenQueue.length > MAX_SEEN) {
    const evicted = seenQueue.shift();
    if (evicted) seenDeliveryIds.delete(evicted);
  }
  return true;
}

export const registerWebhookRoutes: FastifyPluginAsync<WebhookRouteOptions> = async (
  scope: FastifyInstance,
  opts: WebhookRouteOptions,
) => {
  // Scoped raw-body parsing — does not affect other routes.
  scope.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (_req, body: Buffer, done) => done(null, body),
  );

  scope.post<{ Body: Buffer }>('/webhooks/github', async (request, reply) => {
    const rawBody = request.body;
    const deliveryId = request.headers['x-github-delivery'];
    const eventName = request.headers['x-github-event'];
    const sigHeader = request.headers['x-hub-signature-256'];

    if (typeof deliveryId !== 'string' || !deliveryId) {
      throw new ApiError({
        code: 'INVALID_REQUEST',
        message: 'Missing X-GitHub-Delivery header',
        statusCode: 400,
        retryable: false,
      });
    }

    if (typeof eventName !== 'string' || !eventName) {
      throw new ApiError({
        code: 'INVALID_REQUEST',
        message: 'Missing X-GitHub-Event header',
        statusCode: 400,
        retryable: false,
      });
    }

    // Signature verification (skip only when secret is intentionally empty)
    if (opts.webhookSecret) {
      const valid = verifyGitHubSignature(
        rawBody,
        typeof sigHeader === 'string' ? sigHeader : undefined,
        opts.webhookSecret,
      );
      if (!valid) {
        throw new ApiError({
          code: 'GITHUB_WEBHOOK_SIGNATURE_INVALID',
          message: 'Webhook signature verification failed',
          statusCode: 401,
          retryable: false,
        });
      }
    }

    // Idempotency check
    const isNew = recordDeliveryId(deliveryId);
    if (!isNew) {
      const body: DataEnvelope<WebhookAcceptedData> = {
        data: {
          deliveryId,
          eventName,
          action: null,
          status: 'duplicate',
          syncJobsEnqueued: 0,
        },
        meta: { requestId: request.id, timestamp: new Date().toISOString() },
      };
      return reply.status(200).send(body);
    }

    // Parse payload
    let rawPayload: unknown;
    try {
      rawPayload = JSON.parse(rawBody.toString('utf-8'));
    } catch {
      throw new ApiError({
        code: 'INVALID_REQUEST',
        message: 'Webhook payload is not valid JSON',
        statusCode: 400,
        retryable: false,
      });
    }

    const event = normalizeWebhookEvent(eventName, deliveryId, rawPayload);

    // Determine if we should process this event type
    const isSupported = SUPPORTED_WEBHOOK_EVENTS.has(eventName);

    let syncJobsEnqueued = 0;
    if (isSupported) {
      const queue = new SyncJobQueue(request.log);
      const jobs = deriveSyncJobs(event);
      queue.enqueueAll(jobs);
      syncJobsEnqueued = jobs.length;
    } else {
      request.log.debug(
        { eventName, deliveryId },
        'webhook event received but not in supported set — stored, no sync enqueued',
      );
    }

    const body: DataEnvelope<WebhookAcceptedData> = {
      data: {
        deliveryId,
        eventName,
        action: event.action,
        status: isSupported ? 'accepted' : 'ignored',
        syncJobsEnqueued,
      },
      meta: { requestId: request.id, timestamp: new Date().toISOString() },
    };

    return reply.status(202).send(body);
  });
};

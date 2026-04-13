import Fastify, { type FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { registerRequestId } from './plugins/requestId.js';
import { registerAuth } from './plugins/auth.js';
import { registerErrorHandler } from './plugins/errorHandler.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerMeRoutes } from './routes/me.js';
import { registerWebhookRoutes } from './routes/webhooks.js';

export interface CreateServerOptions {
  logger?: boolean;
  /**
   * GitHub App webhook secret for HMAC-SHA256 verification.
   * Defaults to process.env.GITHUB_WEBHOOK_SECRET.
   * Pass an empty string in tests that intentionally skip verification.
   */
  webhookSecret?: string;
}

export function createServer(options: CreateServerOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? true,
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
  });

  registerRequestId(app);
  registerAuth(app);
  registerErrorHandler(app);

  registerHealthRoutes(app);
  registerMeRoutes(app);

  const webhookSecret =
    options.webhookSecret !== undefined
      ? options.webhookSecret
      : (process.env.GITHUB_WEBHOOK_SECRET ?? '');

  app.register(registerWebhookRoutes, { webhookSecret });

  return app;
}

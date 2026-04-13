import Fastify, { type FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { registerRequestId } from './plugins/requestId.js';
import { registerAuth } from './plugins/auth.js';
import { registerErrorHandler } from './plugins/errorHandler.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerMeRoutes } from './routes/me.js';

export interface CreateServerOptions {
  logger?: boolean;
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

  return app;
}

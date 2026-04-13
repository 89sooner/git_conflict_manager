import type { FastifyInstance } from 'fastify';

const HEADER = 'x-request-id';

export function registerRequestId(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    reply.header(HEADER, request.id);
  });
}

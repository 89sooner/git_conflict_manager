import type { FastifyBaseLogger } from 'fastify';

export interface ServiceContext {
  requestId: string;
  logger: FastifyBaseLogger;
}

export abstract class BaseService {
  protected readonly ctx: ServiceContext;

  constructor(ctx: ServiceContext) {
    this.ctx = ctx;
  }
}

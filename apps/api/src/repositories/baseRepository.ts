import type { FastifyBaseLogger } from 'fastify';

export interface RepositoryContext {
  requestId: string;
  logger: FastifyBaseLogger;
}

export abstract class BaseRepository {
  protected readonly ctx: RepositoryContext;

  constructor(ctx: RepositoryContext) {
    this.ctx = ctx;
  }
}

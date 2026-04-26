import type { FastifyInstance } from 'fastify';
import type { ConflictCaseListResponse, ConflictCaseDetailResponse } from '@gsp/shared-types';
import { ConflictService } from '../services/conflictService.js';

export function registerConflictRoutes(app: FastifyInstance) {
  app.get('/api/v1/conflicts', async (request): Promise<ConflictCaseListResponse> => {
    const q = request.query as Record<string, unknown>;
    const svc = new ConflictService({ requestId: request.id, logger: request.log });

    const items = await svc.list({
      repositoryId: typeof q.repositoryId === 'string' ? q.repositoryId : undefined,
      type: typeof q.type === 'string' ? q.type : undefined,
      status: typeof q.status === 'string' ? q.status : undefined,
    });

    return {
      data: items,
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
        total: items.length,
      },
    };
  });

  app.get(
    '/api/v1/conflicts/:conflictCaseId',
    async (request): Promise<ConflictCaseDetailResponse> => {
      const { conflictCaseId } = request.params as { conflictCaseId: string };
      const svc = new ConflictService({ requestId: request.id, logger: request.log });
      const detail = await svc.get(conflictCaseId);

      return {
        data: detail,
        meta: { requestId: request.id, timestamp: new Date().toISOString() },
      };
    },
  );
}

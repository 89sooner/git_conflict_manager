import type { FastifyInstance } from 'fastify';
import type {
  BackoutListResponse,
  BackoutDetailResponse,
  GenerateRevertPullRequestResponse,
  CreateBackoutRequest,
} from '@gsp/shared-types';
import { BOOTSTRAP_DEV_USER } from '@gsp/shared-types';
import { BackoutService } from '../services/backoutService.js';

export function registerBackoutRoutes(app: FastifyInstance) {
  // GET /api/v1/backouts — list backout requests
  app.get('/api/v1/backouts', async (request): Promise<BackoutListResponse> => {
    const q = request.query as Record<string, unknown>;
    const svc = new BackoutService({ requestId: request.id, logger: request.log });

    const items = await svc.list({
      repositoryId: typeof q.repositoryId === 'string' ? q.repositoryId : undefined,
      status: typeof q.status === 'string' ? q.status : undefined,
      branchKind: typeof q.branchKind === 'string' ? q.branchKind : undefined,
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

  // POST /api/v1/backouts — create a backout request
  app.post('/api/v1/backouts', async (request, reply): Promise<BackoutDetailResponse> => {
    const body = request.body as CreateBackoutRequest;
    const svc = new BackoutService({ requestId: request.id, logger: request.log });

    // Use dev user from request context (set by auth plugin)
    const user = (request as unknown as Record<string, unknown>).user ?? BOOTSTRAP_DEV_USER;
    const detail = await svc.create(body, user as typeof BOOTSTRAP_DEV_USER);

    reply.code(201);
    return {
      data: detail,
      meta: { requestId: request.id, timestamp: new Date().toISOString() },
    };
  });

  // GET /api/v1/backouts/:backoutId — get backout detail
  app.get(
    '/api/v1/backouts/:backoutId',
    async (request): Promise<BackoutDetailResponse> => {
      const { backoutId } = request.params as { backoutId: string };
      const svc = new BackoutService({ requestId: request.id, logger: request.log });
      const detail = await svc.get(backoutId);

      return {
        data: detail,
        meta: { requestId: request.id, timestamp: new Date().toISOString() },
      };
    },
  );

  // POST /api/v1/backouts/:backoutId/generate-revert-pr
  app.post(
    '/api/v1/backouts/:backoutId/generate-revert-pr',
    async (request): Promise<GenerateRevertPullRequestResponse> => {
      const { backoutId } = request.params as { backoutId: string };
      const body = (request.body ?? {}) as { dryRun?: boolean };
      const svc = new BackoutService({ requestId: request.id, logger: request.log });

      const result = await svc.generateRevertPr(backoutId, body.dryRun ?? false);

      return {
        data: result,
        meta: { requestId: request.id, timestamp: new Date().toISOString() },
      };
    },
  );
}

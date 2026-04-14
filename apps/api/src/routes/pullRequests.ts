import type { FastifyInstance } from 'fastify';
import type { PullRequestListResponse, PullRequestDetailResponse } from '@gsp/shared-types';
import { PullRequestService } from '../services/pullRequestService.js';

function parsePage(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

function parsePageSize(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 100) : 20;
}

export function registerPullRequestRoutes(app: FastifyInstance) {
  app.get('/api/v1/pull-requests', async (request): Promise<PullRequestListResponse> => {
    const q = request.query as Record<string, unknown>;
    const svc = new PullRequestService({ requestId: request.id, logger: request.log });
    const page = parsePage(q.page);
    const pageSize = parsePageSize(q.pageSize);

    const result = await svc.list({
      repositoryId: typeof q.repositoryId === 'string' ? q.repositoryId : undefined,
      state: typeof q.state === 'string' ? q.state : undefined,
      assignee: typeof q.assignee === 'string' ? q.assignee : undefined,
      riskLevel: typeof q.riskLevel === 'string' ? q.riskLevel : undefined,
      requiresReview: q.requiresReview === 'true' ? true : undefined,
      page,
      pageSize,
    });

    return {
      data: result.items,
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
      },
    };
  });

  app.get(
    '/api/v1/pull-requests/:pullRequestId',
    async (request): Promise<PullRequestDetailResponse> => {
      const { pullRequestId } = request.params as { pullRequestId: string };
      const svc = new PullRequestService({ requestId: request.id, logger: request.log });
      const detail = await svc.get(pullRequestId);
      return {
        data: detail,
        meta: { requestId: request.id, timestamp: new Date().toISOString() },
      };
    },
  );
}

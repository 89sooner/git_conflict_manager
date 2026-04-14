import type { FastifyInstance } from 'fastify';
import type {
  RepositoryListResponse,
  RepositorySummaryResponse,
  BranchListResponse,
  BranchDetailResponse,
} from '@gsp/shared-types';
import { RepositoryService } from '../services/repositoryService.js';
import { BranchService } from '../services/branchService.js';

function parsePage(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

function parsePageSize(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 100) : 20;
}

export function registerRepositoryRoutes(app: FastifyInstance) {
  app.get('/api/v1/repositories', async (request): Promise<RepositoryListResponse> => {
    const q = request.query as Record<string, unknown>;
    const svc = new RepositoryService({ requestId: request.id, logger: request.log });
    const page = parsePage(q.page);
    const pageSize = parsePageSize(q.pageSize);

    const result = await svc.list({
      orgId: typeof q.orgId === 'string' ? q.orgId : undefined,
      search: typeof q.search === 'string' ? q.search : undefined,
      riskLevel: typeof q.riskLevel === 'string' ? q.riskLevel : undefined,
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

  app.get('/api/v1/repositories/:repositoryId', async (request): Promise<RepositorySummaryResponse> => {
    const { repositoryId } = request.params as { repositoryId: string };
    const svc = new RepositoryService({ requestId: request.id, logger: request.log });
    const repo = await svc.get(repositoryId);
    return {
      data: repo,
      meta: { requestId: request.id, timestamp: new Date().toISOString() },
    };
  });

  app.get(
    '/api/v1/repositories/:repositoryId/branches',
    async (request): Promise<BranchListResponse> => {
      const { repositoryId } = request.params as { repositoryId: string };
      const q = request.query as Record<string, unknown>;
      const svc = new BranchService({ requestId: request.id, logger: request.log });

      const branches = await svc.list(
        repositoryId,
        typeof q.kind === 'string' ? q.kind : undefined,
        q.stale === 'true' ? true : q.stale === 'false' ? false : undefined,
      );

      return {
        data: branches,
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          total: branches.length,
        },
      };
    },
  );

  app.get(
    '/api/v1/repositories/:repositoryId/branches/:branchName',
    async (request): Promise<BranchDetailResponse> => {
      const { repositoryId, branchName } = request.params as {
        repositoryId: string;
        branchName: string;
      };
      const svc = new BranchService({ requestId: request.id, logger: request.log });
      const detail = await svc.get(repositoryId, branchName);
      return {
        data: detail,
        meta: { requestId: request.id, timestamp: new Date().toISOString() },
      };
    },
  );
}

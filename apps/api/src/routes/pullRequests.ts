import type { FastifyInstance } from 'fastify';
import type {
  AsyncPendingResponse,
  PullRequestAssistResponse,
  PullRequestDetailResponse,
  PullRequestListResponse,
  PullRequestRiskAnalysisResponse,
  ReviewRecommendationsResponse,
} from '@gsp/shared-types';
import { ApiError } from '../lib/errors.js';
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
      riskLevel:
        typeof q.riskLevel === 'string'
          ? q.riskLevel
          : typeof q.risk === 'string'
            ? q.risk
            : undefined,
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

  app.get(
    '/api/v1/pull-requests/:pullRequestId/risk-analysis',
    async (request, reply): Promise<PullRequestRiskAnalysisResponse | AsyncPendingResponse> => {
      const { pullRequestId } = request.params as { pullRequestId: string };
      const svc = new PullRequestService({ requestId: request.id, logger: request.log });
      const result = await svc.getRiskAnalysis(pullRequestId);

      if (result.kind === 'pending') {
        reply.status(202);
        return {
          data: result.data,
          meta: { requestId: request.id, timestamp: new Date().toISOString() },
        };
      }

      if (result.kind !== 'ready') {
        throw new ApiError({
          code: 'PR_ANALYSIS_FAILED',
          message: 'Unexpected analysis state',
          statusCode: 503,
          retryable: true,
        });
      }

      return {
        data: result.data,
        meta: { requestId: request.id, timestamp: new Date().toISOString() },
      };
    },
  );

  app.get(
    '/api/v1/pull-requests/:pullRequestId/review-recommendations',
    async (request): Promise<ReviewRecommendationsResponse> => {
      const { pullRequestId } = request.params as { pullRequestId: string };
      const svc = new PullRequestService({ requestId: request.id, logger: request.log });
      const result = await svc.getReviewRecommendations(pullRequestId);

      return {
        data: result,
        meta: { requestId: request.id, timestamp: new Date().toISOString() },
      };
    },
  );

  app.post('/api/v1/pull-requests/assist', async (request): Promise<PullRequestAssistResponse> => {
    const body = (request.body ?? {}) as {
      repositoryId?: string;
      sourceBranch?: string;
      baseBranch?: string;
      draft?: boolean;
    };

    if (!body.repositoryId || !body.sourceBranch || !body.baseBranch) {
      throw new ApiError({
        code: 'VALIDATION_FAILED',
        message: 'repositoryId, sourceBranch, and baseBranch are required',
        statusCode: 422,
        retryable: false,
        userAction: '소스 브랜치와 대상 브랜치를 모두 선택하세요.',
      });
    }

    return {
      data: {
        proposedTitle: `${body.draft ? 'draft: ' : ''}${body.sourceBranch.replaceAll('/', ': ')} → ${body.baseBranch}`,
        proposedBody: [
          `Source branch: ${body.sourceBranch}`,
          `Base branch: ${body.baseBranch}`,
          '자동 생성된 PR 보조 초안입니다. CODEOWNERS와 필수 체크를 확인하세요.',
        ].join('\n'),
        recommendedReviewers: [],
        checklist: [
          '필수 리뷰어를 확인했습니다.',
          '변경 영향 모듈을 확인했습니다.',
          '필수 품질 게이트를 확인했습니다.',
        ],
        riskSummary: '정식 위험도 분석 결과는 PR 생성 후 별도 read API에서 제공합니다.',
      },
      meta: { requestId: request.id, timestamp: new Date().toISOString() },
    };
  });
}

import type { PullRequestDetail, PullRequestSummary, ReviewRecommendations } from '@gsp/shared-types';
import { BaseService } from './baseService.js';
import {
  PullRequestRepository,
  type ListPullRequestsFilter,
  type PaginatedResult,
  type RiskAnalysisLookup,
} from '../repositories/pullRequestRepository.js';
import { ApiError } from '../lib/errors.js';

export class PullRequestService extends BaseService {
  private readonly repo: PullRequestRepository;

  constructor(ctx: ConstructorParameters<typeof BaseService>[0]) {
    super(ctx);
    this.repo = new PullRequestRepository(ctx);
  }

  async list(filter: ListPullRequestsFilter): Promise<PaginatedResult<PullRequestSummary>> {
    return this.repo.list(filter);
  }

  async get(id: string): Promise<PullRequestDetail> {
    const result = await this.repo.findById(id);
    if (!result) {
      throw new ApiError({
        code: 'PR_NOT_FOUND',
        message: `Pull request ${id} not found`,
        statusCode: 404,
        retryable: false,
      });
    }
    return result;
  }

  async getRiskAnalysis(id: string): Promise<RiskAnalysisLookup> {
    await this.get(id);
    const result = await this.repo.findRiskAnalysis(id);
    if (!result) {
      return {
        kind: 'pending',
        data: {
          status: 'queued',
          jobId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5',
        },
      };
    }
    if (result.kind === 'failed') {
      throw new ApiError({
        code: 'PR_ANALYSIS_FAILED',
        message: result.message,
        statusCode: 503,
        retryable: result.retryable,
        userAction: '재시도하거나 운영자에게 문의하세요.',
        details: { pullRequestId: id },
      });
    }
    return result;
  }

  async getReviewRecommendations(id: string): Promise<ReviewRecommendations> {
    await this.get(id);
    const result = await this.repo.findReviewRecommendations(id);
    if (!result) {
      throw new ApiError({
        code: 'PR_REVIEWERS_REQUIRED',
        message: `Pull request ${id} review recommendations are not available`,
        statusCode: 422,
        retryable: false,
        userAction: '리뷰어 설정과 CODEOWNERS 구성을 확인하세요.',
      });
    }
    return result;
  }
}

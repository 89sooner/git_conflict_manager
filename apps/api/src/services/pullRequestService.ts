import type { PullRequestSummary, PullRequestDetail } from '@gsp/shared-types';
import { BaseService } from './baseService.js';
import {
  PullRequestRepository,
  type ListPullRequestsFilter,
  type PaginatedResult,
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
}

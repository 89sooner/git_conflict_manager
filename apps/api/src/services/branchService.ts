import type { BranchSummary, BranchDetail } from '@gsp/shared-types';
import { BaseService } from './baseService.js';
import { BranchRepository } from '../repositories/branchRepository.js';
import { ApiError } from '../lib/errors.js';

export class BranchService extends BaseService {
  private readonly repo: BranchRepository;

  constructor(ctx: ConstructorParameters<typeof BaseService>[0]) {
    super(ctx);
    this.repo = new BranchRepository(ctx);
  }

  async list(repositoryId: string, kind?: string, stale?: boolean): Promise<BranchSummary[]> {
    return this.repo.list(repositoryId, kind, stale);
  }

  async get(repositoryId: string, branchName: string): Promise<BranchDetail> {
    const result = await this.repo.findByName(repositoryId, branchName);
    if (!result) {
      throw new ApiError({
        code: 'BRANCH_NOT_FOUND',
        message: `Branch '${branchName}' not found in repository ${repositoryId}`,
        statusCode: 404,
        retryable: false,
      });
    }
    return result;
  }
}

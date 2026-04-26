import type { ConflictCaseSummary, ConflictCaseDetail } from '@gsp/shared-types';
import { BaseService } from './baseService.js';
import { ConflictRepository, type ListConflictsFilter } from '../repositories/conflictRepository.js';
import { ApiError } from '../lib/errors.js';

export class ConflictService extends BaseService {
  private readonly repo: ConflictRepository;

  constructor(ctx: ConstructorParameters<typeof BaseService>[0]) {
    super(ctx);
    this.repo = new ConflictRepository(ctx);
  }

  async list(filter: ListConflictsFilter): Promise<ConflictCaseSummary[]> {
    return this.repo.list(filter);
  }

  async get(id: string): Promise<ConflictCaseDetail> {
    const result = await this.repo.findById(id);
    if (!result) {
      throw new ApiError({
        code: 'CONFLICT_CASE_NOT_FOUND',
        message: `Conflict case ${id} not found`,
        statusCode: 404,
        retryable: false,
      });
    }
    return result;
  }
}

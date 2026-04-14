import type { RepositorySummary } from '@gsp/shared-types';
import { BaseService } from './baseService.js';
import {
  RepositoryRepository,
  type ListRepositoriesFilter,
  type PaginatedResult,
} from '../repositories/repositoryRepository.js';
import { ApiError } from '../lib/errors.js';

export class RepositoryService extends BaseService {
  private readonly repo: RepositoryRepository;

  constructor(ctx: ConstructorParameters<typeof BaseService>[0]) {
    super(ctx);
    this.repo = new RepositoryRepository(ctx);
  }

  async list(filter: ListRepositoriesFilter): Promise<PaginatedResult<RepositorySummary>> {
    return this.repo.list(filter);
  }

  async get(id: string): Promise<RepositorySummary> {
    const result = await this.repo.findById(id);
    if (!result) {
      throw new ApiError({
        code: 'REPOSITORY_NOT_FOUND',
        message: `Repository ${id} not found`,
        statusCode: 404,
        retryable: false,
      });
    }
    return result;
  }
}

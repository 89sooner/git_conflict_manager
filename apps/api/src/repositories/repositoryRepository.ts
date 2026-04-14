import type { RepositorySummary } from '@gsp/shared-types';
import { BaseRepository } from './baseRepository.js';

export interface ListRepositoriesFilter {
  orgId?: string;
  search?: string;
  riskLevel?: string;
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Repository layer for core_repositories.
 * TODO(Phase 4+): replace stub data with pg query once DB connection is wired.
 */
export class RepositoryRepository extends BaseRepository {
  async list(filter: ListRepositoriesFilter): Promise<PaginatedResult<RepositorySummary>> {
    void filter; // DB query goes here
    return { items: [], total: 0, page: filter.page, pageSize: filter.pageSize };
  }

  async findById(id: string): Promise<RepositorySummary | null> {
    void id;
    return null;
  }
}

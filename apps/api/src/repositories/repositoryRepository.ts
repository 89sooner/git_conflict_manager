import type { RepositorySummary } from '@gsp/shared-types';
import { BaseRepository } from './baseRepository.js';
import { MOCK_REPOSITORIES } from '../data/mockReadModel.js';

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

export class RepositoryRepository extends BaseRepository {
  async list(filter: ListRepositoriesFilter): Promise<PaginatedResult<RepositorySummary>> {
    let items = [...MOCK_REPOSITORIES];

    if (filter.search) {
      const query = filter.search.toLowerCase();
      items = items.filter(
        (repo) =>
          repo.name.toLowerCase().includes(query) || repo.fullName.toLowerCase().includes(query),
      );
    }

    if (filter.riskLevel) {
      items = items.filter((repo) => repo.riskLevel === filter.riskLevel);
    }

    const total = items.length;
    const start = (filter.page - 1) * filter.pageSize;
    const paged = items.slice(start, start + filter.pageSize);

    return { items: paged, total, page: filter.page, pageSize: filter.pageSize };
  }

  async findById(id: string): Promise<RepositorySummary | null> {
    return MOCK_REPOSITORIES.find((repo) => repo.id === id) ?? null;
  }
}

import type { PullRequestSummary, PullRequestDetail } from '@gsp/shared-types';
import { BaseRepository } from './baseRepository.js';

export interface ListPullRequestsFilter {
  repositoryId?: string;
  state?: string;
  assignee?: string;
  riskLevel?: string;
  requiresReview?: boolean;
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
 * Repository layer for core_pull_requests.
 * TODO(Phase 4+): replace stub data with pg query once DB connection is wired.
 */
export class PullRequestRepository extends BaseRepository {
  async list(filter: ListPullRequestsFilter): Promise<PaginatedResult<PullRequestSummary>> {
    void filter;
    return { items: [], total: 0, page: filter.page, pageSize: filter.pageSize };
  }

  async findById(id: string): Promise<PullRequestDetail | null> {
    void id;
    return null;
  }
}

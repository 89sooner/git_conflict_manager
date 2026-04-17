import type {
  AsyncPendingResult,
  PullRequestDetail,
  PullRequestRiskAnalysis,
  PullRequestSummary,
  ReviewRecommendations,
} from '@gsp/shared-types';
import { readRuntimeStore } from '@gsp/runtime-store';
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

export type RiskAnalysisLookup =
  | { kind: 'ready'; data: PullRequestRiskAnalysis }
  | { kind: 'pending'; data: AsyncPendingResult }
  | { kind: 'failed'; message: string; retryable: boolean };

export class PullRequestRepository extends BaseRepository {
  async list(filter: ListPullRequestsFilter): Promise<PaginatedResult<PullRequestSummary>> {
    const snapshot = readRuntimeStore();
    let items = [...snapshot.pullRequests];

    if (filter.repositoryId) {
      items = items.filter((pr) => snapshot.pullRequestRepositoryIds[pr.id] === filter.repositoryId);
    }

    if (filter.state && filter.state !== 'all') {
      items = items.filter((pr) => pr.state === filter.state);
    }

    if (filter.riskLevel) {
      items = items.filter((pr) => pr.riskLevel === filter.riskLevel);
    }

    if (typeof filter.requiresReview === 'boolean') {
      items = items.filter((pr) => pr.waitingForReview === filter.requiresReview);
    }

    if (filter.assignee) {
      const assignee = filter.assignee.toLowerCase();
      items = items.filter((pr) => pr.author.login.toLowerCase().includes(assignee));
    }

    const total = items.length;
    const start = (filter.page - 1) * filter.pageSize;
    const paged = items.slice(start, start + filter.pageSize);

    return { items: paged, total, page: filter.page, pageSize: filter.pageSize };
  }

  async findById(id: string): Promise<PullRequestDetail | null> {
    return readRuntimeStore().pullRequestDetails[id] ?? null;
  }

  async findRiskAnalysis(id: string): Promise<RiskAnalysisLookup | null> {
    const row = readRuntimeStore().pullRequestRisks[id];
    if (!row) return null;
    if (row.status === 'succeeded' && row.result) {
      return { kind: 'ready', data: row.result };
    }
    if ((row.status === 'queued' || row.status === 'running' || row.status === 'stale') && row.jobId) {
      return { kind: 'pending', data: { status: row.status === 'running' ? 'running' : 'queued', jobId: row.jobId } };
    }
    if (row.status === 'failed' && row.error) {
      return { kind: 'failed', message: row.error.message, retryable: row.error.retryable };
    }
    return null;
  }

  async findReviewRecommendations(id: string): Promise<ReviewRecommendations | null> {
    const row = readRuntimeStore().reviewRecommendations[id];
    if (!row || row.status !== 'succeeded') return null;
    return row.result;
  }
}

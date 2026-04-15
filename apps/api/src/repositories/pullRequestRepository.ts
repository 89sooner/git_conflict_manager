import type {
  AsyncPendingResult,
  PullRequestDetail,
  PullRequestRiskAnalysis,
  PullRequestSummary,
  ReviewRecommendations,
} from '@gsp/shared-types';
import { BaseRepository } from './baseRepository.js';
import {
  MOCK_PULL_REQUEST_DETAILS,
  MOCK_PULL_REQUESTS,
  MOCK_REVIEW_RECOMMENDATIONS,
  MOCK_RISK_ANALYSIS,
  MOCK_RISK_FAILURES,
  MOCK_RISK_PENDING,
} from '../data/mockReadModel.js';

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
    let items = [...MOCK_PULL_REQUESTS];

    if (filter.repositoryId) {
      items = items.filter((pr) => MOCK_PULL_REQUEST_DETAILS[pr.id]?.pullRequest.id === pr.id);
      items = items.filter((pr) => this.repositoryIdFor(pr.id) === filter.repositoryId);
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
    return MOCK_PULL_REQUEST_DETAILS[id] ?? null;
  }

  async findRiskAnalysis(id: string): Promise<RiskAnalysisLookup | null> {
    if (MOCK_RISK_ANALYSIS[id]) {
      return { kind: 'ready', data: MOCK_RISK_ANALYSIS[id] };
    }
    if (MOCK_RISK_PENDING[id]) {
      return { kind: 'pending', data: MOCK_RISK_PENDING[id] };
    }
    if (MOCK_RISK_FAILURES[id]) {
      return { kind: 'failed', ...MOCK_RISK_FAILURES[id] };
    }
    return null;
  }

  async findReviewRecommendations(id: string): Promise<ReviewRecommendations | null> {
    return MOCK_REVIEW_RECOMMENDATIONS[id] ?? null;
  }

  private repositoryIdFor(pullRequestId: string): string | null {
    switch (pullRequestId) {
      case 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1':
      case 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2':
        return '11111111-1111-4111-8111-111111111111';
      case 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3':
        return '22222222-2222-4222-8222-222222222222';
      default:
        return null;
    }
  }
}

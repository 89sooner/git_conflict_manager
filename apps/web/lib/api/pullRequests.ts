import type {
  PullRequestDetailResponse,
  PullRequestListResponse,
  PullRequestViewState,
  RiskLevel,
} from '@gsp/shared-types';
import { apiFetch } from './client';

export interface ListPullRequestsParams {
  page?: number;
  pageSize?: number;
  repositoryId?: string;
  state?: PullRequestViewState;
  risk?: RiskLevel;
}

export function listPullRequests(params: ListPullRequestsParams = {}): Promise<PullRequestListResponse> {
  return apiFetch<PullRequestListResponse>('/api/v1/pull-requests', { query: params });
}

export function getPullRequest(pullRequestId: string): Promise<PullRequestDetailResponse> {
  return apiFetch<PullRequestDetailResponse>(
    `/api/v1/pull-requests/${encodeURIComponent(pullRequestId)}`,
  );
}

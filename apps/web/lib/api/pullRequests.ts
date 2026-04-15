import type {
  DataEnvelope,
  PullRequestDetailResponse,
  PullRequestListResponse,
  RiskSignal,
  PullRequestViewState,
  RiskLevel,
  UserSummary,
} from '@gsp/shared-types';
import { apiFetch } from './client';
import type { QueryValue } from './client';

export interface ListPullRequestsParams {
  [key: string]: QueryValue;
  page?: number;
  pageSize?: number;
  repositoryId?: string;
  state?: PullRequestViewState;
  riskLevel?: RiskLevel;
}

export interface PullRequestRiskAnalysisReady {
  riskLevel: RiskLevel;
  score: number;
  summary: string;
  signals: RiskSignal[];
  recommendedTests: string[];
  impactedModules: string[];
}

export interface PullRequestRiskAnalysisPending {
  status: 'queued' | 'running';
  jobId: string;
}

export type PullRequestRiskAnalysisResponse = DataEnvelope<
  PullRequestRiskAnalysisReady | PullRequestRiskAnalysisPending
>;

export interface PullRequestReviewRecommendations {
  requiredCodeOwners: string[];
  missingCodeOwners: string[];
  recommendedReviewers: UserSummary[];
  rationale: string[];
}

export type PullRequestReviewRecommendationsResponse = DataEnvelope<PullRequestReviewRecommendations>;

export function listPullRequests(params: ListPullRequestsParams = {}): Promise<PullRequestListResponse> {
  return apiFetch<PullRequestListResponse>('/api/v1/pull-requests', { query: params });
}

export function getPullRequest(pullRequestId: string): Promise<PullRequestDetailResponse> {
  return apiFetch<PullRequestDetailResponse>(
    `/api/v1/pull-requests/${encodeURIComponent(pullRequestId)}`,
  );
}

export function getPullRequestRiskAnalysis(
  pullRequestId: string,
): Promise<PullRequestRiskAnalysisResponse> {
  return apiFetch<PullRequestRiskAnalysisResponse>(
    `/api/v1/pull-requests/${encodeURIComponent(pullRequestId)}/risk-analysis`,
  );
}

export function getPullRequestReviewRecommendations(
  pullRequestId: string,
): Promise<PullRequestReviewRecommendationsResponse> {
  return apiFetch<PullRequestReviewRecommendationsResponse>(
    `/api/v1/pull-requests/${encodeURIComponent(pullRequestId)}/review-recommendations`,
  );
}

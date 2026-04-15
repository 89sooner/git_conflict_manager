import type {
  BranchListResponse,
  RepositoryListResponse,
  RepositorySummaryResponse,
} from '@gsp/shared-types';
import { apiFetch } from './client';
import type { QueryValue } from './client';

export interface ListRepositoriesParams {
  [key: string]: QueryValue;
  page?: number;
  pageSize?: number;
}

export interface ListBranchesParams {
  [key: string]: QueryValue;
  page?: number;
  pageSize?: number;
}

export function listRepositories(params: ListRepositoriesParams = {}): Promise<RepositoryListResponse> {
  return apiFetch<RepositoryListResponse>('/api/v1/repositories', { query: params });
}

export function getRepository(repositoryId: string): Promise<RepositorySummaryResponse> {
  return apiFetch<RepositorySummaryResponse>(`/api/v1/repositories/${encodeURIComponent(repositoryId)}`);
}

export function listBranches(
  repositoryId: string,
  params: ListBranchesParams = {},
): Promise<BranchListResponse> {
  return apiFetch<BranchListResponse>(
    `/api/v1/repositories/${encodeURIComponent(repositoryId)}/branches`,
    { query: params },
  );
}

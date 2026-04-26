import type {
  BackoutListResponse,
  BackoutDetailResponse,
  CreateBackoutRequest,
  GenerateRevertPullRequestResponse,
} from '@gsp/shared-types';
import { apiFetch } from './client';
import type { QueryValue } from './client';

export interface ListBackoutsParams {
  [key: string]: QueryValue;
  repositoryId?: string;
  status?: string;
  branchKind?: string;
}

export function listBackouts(params: ListBackoutsParams = {}): Promise<BackoutListResponse> {
  return apiFetch<BackoutListResponse>('/api/v1/backouts', { query: params });
}

export function getBackout(id: string): Promise<BackoutDetailResponse> {
  return apiFetch<BackoutDetailResponse>(`/api/v1/backouts/${encodeURIComponent(id)}`);
}

export function createBackout(req: CreateBackoutRequest): Promise<BackoutDetailResponse> {
  return apiFetch<BackoutDetailResponse>('/api/v1/backouts', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export function generateRevertPr(
  id: string,
  dryRun: boolean,
): Promise<GenerateRevertPullRequestResponse> {
  return apiFetch<GenerateRevertPullRequestResponse>(
    `/api/v1/backouts/${encodeURIComponent(id)}/generate-revert-pr`,
    {
      method: 'POST',
      body: JSON.stringify({ dryRun }),
    },
  );
}

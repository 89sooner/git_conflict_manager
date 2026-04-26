import type {
  ConflictCaseListResponse,
  ConflictCaseDetailResponse,
  ConflictCaseStatus,
  ConflictType,
} from '@gsp/shared-types';
import { apiFetch } from './client';
import type { QueryValue } from './client';

export interface ListConflictsParams {
  [key: string]: QueryValue;
  repositoryId?: string;
  type?: ConflictType;
  status?: ConflictCaseStatus;
}

export function listConflicts(params: ListConflictsParams = {}): Promise<ConflictCaseListResponse> {
  return apiFetch<ConflictCaseListResponse>('/api/v1/conflicts', { query: params });
}

export function getConflictCase(conflictCaseId: string): Promise<ConflictCaseDetailResponse> {
  return apiFetch<ConflictCaseDetailResponse>(
    `/api/v1/conflicts/${encodeURIComponent(conflictCaseId)}`,
  );
}

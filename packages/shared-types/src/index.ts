export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type PullRequestState =
  | 'draft'
  | 'open'
  | 'under-review'
  | 'changes-requested'
  | 'approved'
  | 'merge-blocked'
  | 'ready-to-merge'
  | 'queued-for-merge'
  | 'merged'
  | 'closed'
  | 'reverted';

export type BackoutState =
  | 'draft'
  | 'validating'
  | 'pending-approval'
  | 'approved'
  | 'blocked'
  | 'ready'
  | 'pr-generating'
  | 'pr-open'
  | 'queued-for-merge'
  | 'merged'
  | 'failed'
  | 'cancelled';

export interface ApiMeta {
  requestId?: string;
  page?: number;
  pageSize?: number;
  total?: number;
}

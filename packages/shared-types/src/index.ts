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

export const BACKOUT_STATES = [
  'draft',
  'validating',
  'pending-approval',
  'approved',
  'blocked',
  'ready',
  'pr-generating',
  'pr-open',
  'queued-for-merge',
  'merged',
  'failed',
  'cancelled',
] as const satisfies readonly BackoutState[];

/**
 * Error codes. Canonical catalog: `docs/03-api/error_code_standard.md`.
 * Additions require updating that document, `openapi.yaml`, and this file.
 */
export type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_TOKEN_EXPIRED'
  | 'AUTH_TOKEN_INVALID'
  | 'SSO_ACCESS_DENIED'
  | 'PERMISSION_DENIED'
  | 'REPOSITORY_ACCESS_DENIED'
  | 'ORG_SCOPE_DENIED'
  | 'ADMIN_REQUIRED'
  | 'INVALID_REQUEST'
  | 'INVALID_FILTER'
  | 'VALIDATION_FAILED'
  | 'IDEMPOTENCY_KEY_CONFLICT'
  | 'GITHUB_APP_NOT_INSTALLED'
  | 'GITHUB_APP_PERMISSION_INSUFFICIENT'
  | 'GITHUB_API_RATE_LIMITED'
  | 'GITHUB_API_UNAVAILABLE'
  | 'GITHUB_WEBHOOK_SIGNATURE_INVALID'
  | 'GITHUB_RESOURCE_STALE'
  | 'REPOSITORY_NOT_FOUND'
  | 'BRANCH_NOT_FOUND'
  | 'BASE_BRANCH_REQUIRED'
  | 'BRANCH_NAME_INVALID'
  | 'HISTORY_GRAPH_TOO_LARGE'
  | 'PR_NOT_FOUND'
  | 'PR_ANALYSIS_NOT_READY'
  | 'PR_ANALYSIS_FAILED'
  | 'PR_BASE_BRANCH_INVALID'
  | 'PR_REVIEWERS_REQUIRED'
  | 'PR_CODEOWNERS_MISSING'
  | 'PR_REQUIRED_CHECKS_FAILED'
  | 'PR_MERGE_QUEUE_REQUIRED'
  | 'PR_ALREADY_LINKED'
  | 'CONFLICT_CASE_NOT_FOUND'
  | 'CONFLICT_TYPE_UNSUPPORTED'
  | 'CONFLICT_CONTEXT_INSUFFICIENT'
  | 'CONFLICT_GUIDANCE_NOT_READY'
  | 'CONFLICT_ESCALATION_REQUIRED'
  | 'BACKOUT_NOT_FOUND'
  | 'BACKOUT_REASON_REQUIRED'
  | 'BACKOUT_TARGET_REQUIRED'
  | 'BACKOUT_APPROVER_REQUIRED'
  | 'BACKOUT_ALREADY_EXISTS'
  | 'BACKOUT_REVERT_PR_GENERATION_FAILED'
  | 'BACKOUT_RELEASE_POLICY_BLOCKED'
  | 'BACKOUT_CONFLICT_PREDICTED'
  | 'POLICY_TEMPLATE_NOT_FOUND'
  | 'POLICY_RULE_INVALID'
  | 'POLICY_APPLY_SCOPE_INVALID'
  | 'POLICY_EXCEPTION_REQUIRED'
  | 'POLICY_ENFORCEMENT_BLOCKED'
  | 'POLICY_VERSION_CONFLICT'
  | 'DASHBOARD_RANGE_INVALID'
  | 'ANALYTICS_NOT_READY'
  | 'JOB_NOT_FOUND'
  | 'JOB_ALREADY_TERMINAL'
  | 'JOB_TIMEOUT'
  | 'JOB_WORKER_UNAVAILABLE'
  | 'INTERNAL_SERVER_ERROR'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'DATABASE_UNAVAILABLE'
  | 'CACHE_UNAVAILABLE'
  | 'UPSTREAM_TIMEOUT';

export interface ApiMeta {
  requestId: string;
  timestamp?: string;
  page?: number;
  pageSize?: number;
  total?: number;
}

export interface ErrorBody {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
  userAction?: string;
}

export interface ErrorEnvelope {
  error: ErrorBody;
  meta: ApiMeta;
}

export interface DataEnvelope<T> {
  data: T;
  meta: ApiMeta;
}

export interface UserSummary {
  id: string;
  login: string;
  displayName: string;
  email: string | null;
}

export interface UserProfile {
  user: UserSummary;
  permissions: string[];
}

export type UserProfileResponse = DataEnvelope<UserProfile>;

/**
 * Dev auth header name. The API accepts this header only in Phase ≤ 10 while
 * SSO/OIDC is deferred. Both `apps/web` (injector) and `apps/api` (acceptor)
 * must agree on the header name and the bootstrap user shape to avoid
 * identity drift between the AppShell display and `/api/v1/me`.
 *
 * See `docs/05-decisions/adr-0001-web-data-fetching-strategy.md` (Decision 2).
 */
export const DEV_USER_HEADER = 'x-gsp-dev-user';

/**
 * Canonical bootstrap dev user. Used by both the API auth plugin
 * (`apps/api/src/plugins/auth.ts`) and the web session resolver
 * (`apps/web/lib/auth/session.ts`). Editing either side in isolation will
 * break identity round-trips between the shell header and `/api/v1/me`.
 */
export const BOOTSTRAP_DEV_USER: UserSummary = {
  id: '00000000-0000-0000-0000-000000000000',
  login: 'bootstrap-user',
  displayName: 'Bootstrap User',
  email: null,
};

/**
 * The literal value the API accepts in the `DEV_USER_HEADER`. Web callers
 * must send exactly this string; any other value is rejected as anonymous.
 */
export const DEV_USER_BOOTSTRAP_TOKEN = 'bootstrap';

// ─── Read model types — Phase 4 ────────────────────────────────────────────

export type RepositoryVisibility = 'private' | 'internal' | 'public';
export type BranchKind = 'default' | 'release' | 'feature' | 'hotfix' | 'other';
export type PullRequestViewState = 'open' | 'closed' | 'merged' | 'draft';

/** mirrors openapi.yaml #/components/schemas/RepositorySummary */
export interface RepositorySummary {
  id: string;
  githubNodeId: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  visibility: RepositoryVisibility;
  teamName: string | null;
  riskLevel: RiskLevel;
  openPullRequestCount: number;
  staleBranchCount: number;
}

/** mirrors openapi.yaml #/components/schemas/BranchSummary */
export interface BranchSummary {
  name: string;
  kind: BranchKind;
  isProtected: boolean;
  isStale: boolean;
  aheadBy: number;
  behindBy: number;
  latestCommitSha: string;
}

export interface BuildSummary {
  id: string;
  provider: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  targetName: string;
  url: string;
}

export type StaticAnalysisStatus = 'not-required' | 'pending' | 'passed' | 'failed';

/** mirrors openapi.yaml #/components/schemas/PullRequestSummary */
export interface PullRequestSummary {
  id: string;
  number: number;
  title: string;
  state: PullRequestViewState;
  author: UserSummary;
  baseBranch: string;
  headBranch: string;
  riskLevel: RiskLevel;
  hasConflicts: boolean;
  waitingForReview: boolean;
  updatedAt: string;
}

export interface PullRequestReviewStatus {
  reviewerCount: number;
  requiredReviewerCount: number;
  approvals: number;
  changesRequested: number;
  codeOwnersSatisfied: boolean;
  checklistCompleted: boolean;
  missingReviewers: string[];
  pendingReviewers: string[];
}

export interface PullRequestQualityGateStatus {
  requiredChecksPassed: boolean;
  requiredCheckCount: number;
  requiredCheckPassingCount: number;
  failingChecks: string[];
  mergeBlockedReasons: string[];
  staticAnalysisStatus: StaticAnalysisStatus;
  commitMessagePolicyPassed: boolean;
  releaseImpact: boolean;
  mergeQueueRequired: boolean;
}

export interface PullRequestDetail {
  pullRequest: PullRequestSummary;
  workflowState: PullRequestState;
  githubUrl: string;
  interpretedSummary: string;
  changedFiles: number;
  commits: number;
  labels: string[];
  linkedBuilds: BuildSummary[];
  relatedIssues: string[];
  reviewStatus: PullRequestReviewStatus;
  qualityGateStatus: PullRequestQualityGateStatus;
}

export interface RiskSignal {
  type: string;
  severity: RiskLevel;
  summary: string;
  scoreContribution: number;
}

export interface PullRequestRiskAnalysis {
  riskLevel: RiskLevel;
  score: number;
  summary: string;
  signals: RiskSignal[];
  recommendedTests: string[];
  impactedModules: string[];
}

export interface ReviewRecommendations {
  requiredCodeOwners: string[];
  missingCodeOwners: string[];
  recommendedReviewers: UserSummary[];
  rationale: string[];
}

export interface AsyncPendingResult {
  status: 'queued' | 'running';
  jobId: string;
}

export interface PullRequestAssistRequestBody {
  repositoryId: string;
  sourceBranch: string;
  baseBranch: string;
  draft?: boolean;
}

export interface PullRequestAssistResult {
  proposedTitle: string;
  proposedBody: string;
  recommendedReviewers: UserSummary[];
  checklist: string[];
  riskSummary: string;
}

export interface BranchDetail {
  branch: BranchSummary;
  interpretedStatus: string;
  recommendedActions: string[];
  linkedPullRequest: PullRequestSummary | null;
}

// Response envelope aliases
export type RepositoryListResponse = DataEnvelope<RepositorySummary[]>;
export type RepositorySummaryResponse = DataEnvelope<RepositorySummary>;
export type BranchListResponse = DataEnvelope<BranchSummary[]>;
export type BranchDetailResponse = DataEnvelope<BranchDetail>;
export type PullRequestListResponse = DataEnvelope<PullRequestSummary[]>;
export type PullRequestDetailResponse = DataEnvelope<PullRequestDetail>;
export type PullRequestRiskAnalysisResponse = DataEnvelope<PullRequestRiskAnalysis>;
export type ReviewRecommendationsResponse = DataEnvelope<ReviewRecommendations>;
export type AsyncPendingResponse = DataEnvelope<AsyncPendingResult>;
export type PullRequestAssistResponse = DataEnvelope<PullRequestAssistResult>;

/**
 * Badge tones — mirrors `docs/04-frontend/frontend_badge_action_mapping.md` §4.2.
 * Frontend badge components must map every state to one of these tokens.
 */
export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'queue';

export interface BadgeDescriptor {
  label: string;
  tone: BadgeTone;
  description: string;
}

export const PR_STATE_BADGES = {
  draft: { label: 'Draft', tone: 'neutral', description: '리뷰 준비 전' },
  open: { label: 'Open', tone: 'info', description: '오픈됨' },
  'under-review': { label: 'In Review', tone: 'info', description: '리뷰 진행 중' },
  'changes-requested': {
    label: 'Changes Requested',
    tone: 'warning',
    description: '수정 필요',
  },
  approved: { label: 'Approved', tone: 'success', description: '승인 조건 충족' },
  'merge-blocked': { label: 'Merge Blocked', tone: 'danger', description: '병합 차단' },
  'ready-to-merge': { label: 'Ready to Merge', tone: 'success', description: '병합 가능' },
  'queued-for-merge': {
    label: 'In Merge Queue',
    tone: 'queue',
    description: 'merge queue 대기',
  },
  merged: { label: 'Merged', tone: 'success', description: '병합 완료' },
  closed: { label: 'Closed', tone: 'neutral', description: '병합 없이 종료' },
  reverted: { label: 'Reverted', tone: 'danger', description: '병합 후 되돌려짐' },
} as const satisfies Record<PullRequestState, BadgeDescriptor>;

export const RISK_BADGES = {
  low: { label: 'Low Risk', tone: 'neutral', description: '낮음' },
  medium: { label: 'Medium Risk', tone: 'info', description: '보통' },
  high: { label: 'High Risk', tone: 'warning', description: '높음' },
  critical: { label: 'Critical Risk', tone: 'danger', description: '심각' },
} as const satisfies Record<RiskLevel, BadgeDescriptor>;

export const BACKOUT_STATE_BADGES = {
  draft: { label: 'Draft', tone: 'neutral', description: '초안' },
  validating: { label: 'Validating', tone: 'info', description: '검증 중' },
  'pending-approval': {
    label: 'Pending Approval',
    tone: 'warning',
    description: '승인 대기',
  },
  approved: { label: 'Approved', tone: 'success', description: '승인됨' },
  blocked: { label: 'Blocked', tone: 'danger', description: '정책/충돌 차단' },
  ready: { label: 'Ready', tone: 'success', description: '실행 준비 완료' },
  'pr-generating': {
    label: 'Generating PR',
    tone: 'info',
    description: 'revert PR 생성 중',
  },
  'pr-open': { label: 'PR Open', tone: 'info', description: 'revert PR 오픈됨' },
  'queued-for-merge': {
    label: 'In Merge Queue',
    tone: 'queue',
    description: 'merge queue 대기',
  },
  merged: { label: 'Merged', tone: 'success', description: 'revert 완료' },
  failed: { label: 'Failed', tone: 'danger', description: '실패' },
  cancelled: { label: 'Cancelled', tone: 'neutral', description: '취소됨' },
} as const satisfies Record<BackoutState, BadgeDescriptor>;

export function pullRequestBadge(state: PullRequestState): BadgeDescriptor {
  return PR_STATE_BADGES[state];
}

export function riskBadge(level: RiskLevel): BadgeDescriptor {
  return RISK_BADGES[level];
}

export function backoutBadge(state: BackoutState): BadgeDescriptor {
  return BACKOUT_STATE_BADGES[state];
}

/**
 * Conflict Case 상태 — mirrors docs/03-api/state_transition_spec.md §6.1.
 */
export type ConflictCaseStatus =
  | 'detected'
  | 'analyzing'
  | 'guided'
  | 'user-working'
  | 'resolved'
  | 'aborted'
  | 'stale';

export const CONFLICT_STATUS_BADGES = {
  detected: {
    label: 'Conflict Detected',
    tone: 'warning' as BadgeTone,
    description: '충돌 감지됨, 해결 필요',
  },
  analyzing: {
    label: 'Analyzing',
    tone: 'info' as BadgeTone,
    description: '충돌 유형 분석 중',
  },
  guided: {
    label: 'Guide Ready',
    tone: 'warning' as BadgeTone,
    description: '가이드 제공 완료, 해결 진행 필요',
  },
  'user-working': {
    label: 'In Progress',
    tone: 'info' as BadgeTone,
    description: '해결 작업 중',
  },
  resolved: {
    label: 'Resolved',
    tone: 'success' as BadgeTone,
    description: '충돌 해결 완료',
  },
  aborted: {
    label: 'Aborted',
    tone: 'neutral' as BadgeTone,
    description: '작업 중단',
  },
  stale: {
    label: 'Stale',
    tone: 'warning' as BadgeTone,
    description: '원본 변경으로 재분석 필요',
  },
} as const satisfies Record<ConflictCaseStatus, BadgeDescriptor>;

export function conflictBadge(status: ConflictCaseStatus): BadgeDescriptor {
  return CONFLICT_STATUS_BADGES[status];
}

/**
 * Supported GitHub webhook event names.
 * Mirrors docs/02-architecture/github_app_integration_design.md §6.2 MVP events.
 */
export type SupportedWebhookEventName =
  | 'installation'
  | 'installation_repositories'
  | 'repository'
  | 'push'
  | 'pull_request'
  | 'pull_request_review'
  | 'pull_request_review_thread'
  | 'check_suite'
  | 'check_run'
  | 'merge_group';

export const SUPPORTED_WEBHOOK_EVENTS = new Set<string>([
  'installation',
  'installation_repositories',
  'repository',
  'push',
  'pull_request',
  'pull_request_review',
  'pull_request_review_thread',
  'check_suite',
  'check_run',
  'merge_group',
]);

/**
 * Normalized internal representation of an inbound GitHub webhook event.
 * Decouples downstream processing from raw GitHub payload shapes.
 */
export interface NormalizedWebhookEvent {
  /** GitHub's X-GitHub-Delivery header value. Globally unique per delivery. */
  deliveryId: string;
  /** GitHub App installation ID (null for org-level events without repo). */
  installationId: number | null;
  /** GitHub organization ID from payload.organization.id */
  orgGithubId: number | null;
  /** GitHub repository ID from payload.repository.id */
  repoGithubId: number | null;
  /** Full repo name e.g. "my-org/my-repo" */
  repoFullName: string | null;
  /** Event name from X-GitHub-Event header */
  eventName: string;
  /** payload.action field, null when absent (e.g. push) */
  action: string | null;
  /** payload.sender.id */
  senderGithubId: number | null;
  /** Primary entity ID (PR id, check_suite id, etc.) */
  resourceGithubId: number | null;
  /** PR number or issue number when applicable */
  resourceNumber: number | null;
  /**
   * Idempotency key for deduplication.
   * Equal to deliveryId — GitHub guarantees delivery_id is globally unique.
   * Full DB-level dedup uses integration_webhook_events.delivery_id unique constraint.
   */
  idempotencyKey: string;
  receivedAt: string;
  rawPayload: unknown;
}

export type SyncJobType = 'repo_sync' | 'pr_sync' | 'branch_sync' | 'check_sync' | 'backfill';
export type SyncTriggerType = 'webhook' | 'scheduler' | 'manual' | 'retry';

export interface SyncJobRequest {
  jobType: SyncJobType;
  triggerType: SyncTriggerType;
  orgGithubId?: number | null;
  repoGithubId?: number | null;
  parameters?: Record<string, unknown>;
  /** correlates back to the originating delivery_id */
  correlationId: string;
}

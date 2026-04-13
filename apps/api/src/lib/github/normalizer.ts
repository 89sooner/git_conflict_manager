import type { NormalizedWebhookEvent, SyncJobRequest } from './types.js';

type RawPayload = Record<string, unknown>;

function num(val: unknown): number | null {
  return typeof val === 'number' ? val : null;
}

function str(val: unknown): string | null {
  return typeof val === 'string' ? val : null;
}

function obj(val: unknown): RawPayload | undefined {
  return val != null && typeof val === 'object' && !Array.isArray(val)
    ? (val as RawPayload)
    : undefined;
}

/**
 * Normalizes a raw GitHub webhook payload into a stable internal event shape.
 * Pure function — no side effects, fully testable without a live server.
 */
export function normalizeWebhookEvent(
  eventName: string,
  deliveryId: string,
  rawPayload: unknown,
): NormalizedWebhookEvent {
  const p = obj(rawPayload) ?? {};

  const action = str(p.action);
  const installation = obj(p.installation);
  const installationId = num(installation?.id);
  const organization = obj(p.organization);
  const orgGithubId = num(organization?.id);
  const repository = obj(p.repository);
  const repoGithubId = num(repository?.id);
  const repoFullName = str(repository?.full_name);
  const sender = obj(p.sender);
  const senderGithubId = num(sender?.id);

  let resourceGithubId: number | null = null;
  let resourceNumber: number | null = null;

  switch (eventName) {
    case 'pull_request':
    case 'pull_request_review':
    case 'pull_request_review_thread': {
      const pr = obj(p.pull_request);
      resourceGithubId = num(pr?.id);
      resourceNumber = num(pr?.number);
      break;
    }
    case 'installation': {
      resourceGithubId = installationId;
      break;
    }
    case 'installation_repositories': {
      // resource is the installation itself
      resourceGithubId = installationId;
      break;
    }
    case 'push': {
      // no single resource id; after field is the latest commit sha (string)
      break;
    }
    case 'check_suite': {
      const suite = obj(p.check_suite);
      resourceGithubId = num(suite?.id);
      break;
    }
    case 'check_run': {
      const run = obj(p.check_run);
      resourceGithubId = num(run?.id);
      break;
    }
    case 'merge_group': {
      const mg = obj(p.merge_group);
      resourceGithubId = num(mg?.id);
      break;
    }
    default:
      break;
  }

  return {
    deliveryId,
    installationId,
    orgGithubId,
    repoGithubId,
    repoFullName,
    eventName,
    action,
    senderGithubId,
    resourceGithubId,
    resourceNumber,
    idempotencyKey: deliveryId,
    receivedAt: new Date().toISOString(),
    rawPayload,
  };
}

/**
 * Derives zero or more sync job requests from a normalized webhook event.
 * Returns an empty array for events that don't require immediate sync.
 */
export function deriveSyncJobs(event: NormalizedWebhookEvent): SyncJobRequest[] {
  const jobs: SyncJobRequest[] = [];
  const { eventName, action, repoGithubId, orgGithubId, deliveryId, resourceNumber } = event;

  switch (eventName) {
    case 'installation':
      if (action === 'created' || action === 'new_permissions_accepted') {
        jobs.push({
          jobType: 'repo_sync',
          triggerType: 'webhook',
          orgGithubId,
          correlationId: deliveryId,
        });
      }
      break;

    case 'installation_repositories':
      if (action === 'added') {
        jobs.push({
          jobType: 'repo_sync',
          triggerType: 'webhook',
          orgGithubId,
          repoGithubId,
          correlationId: deliveryId,
        });
      }
      break;

    case 'repository':
      if (action !== 'deleted') {
        jobs.push({
          jobType: 'repo_sync',
          triggerType: 'webhook',
          repoGithubId,
          correlationId: deliveryId,
        });
      }
      break;

    case 'push':
      jobs.push({
        jobType: 'branch_sync',
        triggerType: 'webhook',
        repoGithubId,
        correlationId: deliveryId,
      });
      break;

    case 'pull_request':
    case 'pull_request_review':
      jobs.push({
        jobType: 'pr_sync',
        triggerType: 'webhook',
        repoGithubId,
        parameters: { prNumber: resourceNumber },
        correlationId: deliveryId,
      });
      break;

    case 'check_suite':
    case 'check_run':
      jobs.push({
        jobType: 'check_sync',
        triggerType: 'webhook',
        repoGithubId,
        correlationId: deliveryId,
      });
      break;

    default:
      break;
  }

  return jobs;
}

import { describe, it, expect } from 'vitest';
import {
  normalizeWebhookEvent,
  deriveSyncJobs,
} from '../../../apps/api/src/lib/github/normalizer.js';
import { SUPPORTED_WEBHOOK_EVENTS } from '../../../apps/api/src/lib/github/types.js';

const DELIVERY = 'test-delivery-001';

describe('normalizeWebhookEvent', () => {
  it('extracts PR fields from pull_request payload', () => {
    const payload = {
      action: 'opened',
      pull_request: { id: 9001, number: 42 },
      repository: { id: 1111, full_name: 'acme/core' },
      organization: { id: 3333 },
      sender: { id: 5555 },
      installation: { id: 99 },
    };
    const event = normalizeWebhookEvent('pull_request', DELIVERY, payload);
    expect(event.eventName).toBe('pull_request');
    expect(event.action).toBe('opened');
    expect(event.resourceGithubId).toBe(9001);
    expect(event.resourceNumber).toBe(42);
    expect(event.repoGithubId).toBe(1111);
    expect(event.repoFullName).toBe('acme/core');
    expect(event.orgGithubId).toBe(3333);
    expect(event.senderGithubId).toBe(5555);
    expect(event.installationId).toBe(99);
    expect(event.idempotencyKey).toBe(DELIVERY);
    expect(event.deliveryId).toBe(DELIVERY);
    expect(typeof event.receivedAt).toBe('string');
  });

  it('extracts check_suite id', () => {
    const payload = {
      action: 'completed',
      check_suite: { id: 8888 },
      repository: { id: 1111, full_name: 'acme/core' },
      installation: { id: 99 },
      sender: { id: 5555 },
    };
    const event = normalizeWebhookEvent('check_suite', DELIVERY, payload);
    expect(event.resourceGithubId).toBe(8888);
    expect(event.resourceNumber).toBeNull();
  });

  it('handles push event (no resourceGithubId)', () => {
    const payload = {
      ref: 'refs/heads/main',
      after: 'abc123',
      repository: { id: 2222, full_name: 'acme/core' },
      installation: { id: 99 },
      sender: { id: 7777 },
    };
    const event = normalizeWebhookEvent('push', DELIVERY, payload);
    expect(event.eventName).toBe('push');
    expect(event.action).toBeNull();
    expect(event.resourceGithubId).toBeNull();
    expect(event.repoGithubId).toBe(2222);
  });

  it('tolerates empty/unknown payload without throwing', () => {
    expect(() => normalizeWebhookEvent('unknown_event', DELIVERY, {})).not.toThrow();
    expect(() => normalizeWebhookEvent('push', DELIVERY, null)).not.toThrow();
    expect(() => normalizeWebhookEvent('push', DELIVERY, 'bad')).not.toThrow();
  });
});

describe('deriveSyncJobs', () => {
  it('enqueues pr_sync for pull_request events', () => {
    const payload = {
      action: 'opened',
      pull_request: { id: 9001, number: 5 },
      repository: { id: 1111, full_name: 'acme/core' },
    };
    const event = normalizeWebhookEvent('pull_request', DELIVERY, payload);
    const jobs = deriveSyncJobs(event);
    expect(jobs.length).toBe(1);
    expect(jobs[0].jobType).toBe('pr_sync');
    expect(jobs[0].triggerType).toBe('webhook');
    expect(jobs[0].parameters?.prNumber).toBe(5);
  });

  it('enqueues branch_sync for push events', () => {
    const payload = {
      ref: 'refs/heads/feature',
      repository: { id: 2222, full_name: 'acme/core' },
    };
    const event = normalizeWebhookEvent('push', DELIVERY, payload);
    const jobs = deriveSyncJobs(event);
    expect(jobs.length).toBe(1);
    expect(jobs[0].jobType).toBe('branch_sync');
  });

  it('enqueues repo_sync when installation is created', () => {
    const payload = {
      action: 'created',
      installation: { id: 10 },
      organization: { id: 555 },
    };
    const event = normalizeWebhookEvent('installation', DELIVERY, payload);
    const jobs = deriveSyncJobs(event);
    expect(jobs.length).toBe(1);
    expect(jobs[0].jobType).toBe('repo_sync');
  });

  it('enqueues no jobs for unsupported events', () => {
    const event = normalizeWebhookEvent('star', DELIVERY, { action: 'created' });
    const jobs = deriveSyncJobs(event);
    expect(jobs.length).toBe(0);
  });

  it('enqueues no repo_sync when installation is deleted', () => {
    const payload = { action: 'deleted', installation: { id: 10 } };
    const event = normalizeWebhookEvent('installation', DELIVERY, payload);
    const jobs = deriveSyncJobs(event);
    expect(jobs.length).toBe(0);
  });
});

describe('SUPPORTED_WEBHOOK_EVENTS set', () => {
  it('contains all MVP required event names from design doc §6.2', () => {
    const required = [
      'installation',
      'installation_repositories',
      'repository',
      'push',
      'pull_request',
      'pull_request_review',
      'check_suite',
      'check_run',
      'merge_group',
    ];
    for (const name of required) {
      expect(SUPPORTED_WEBHOOK_EVENTS.has(name)).toBe(true);
    }
  });
});

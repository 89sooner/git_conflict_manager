import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { enqueueSyncJob, readRuntimeStore, resetRuntimeStore } from '@gsp/runtime-store';
import { processPendingSyncJobs } from '../src/jobs/pullRequestAnalysis.js';

const STORE_FILE = '/tmp/gsp-worker-test-store.json';

beforeEach(() => {
  process.env.GSP_RUNTIME_STORE_FILE = STORE_FILE;
  resetRuntimeStore();
});

afterEach(() => {
  delete process.env.GSP_RUNTIME_STORE_FILE;
});

describe('processPendingSyncJobs', () => {
  it('processes queued pr_sync jobs into risk and review read models', () => {
    enqueueSyncJob({
      jobType: 'pr_sync',
      triggerType: 'webhook',
      repoGithubId: 1111,
      parameters: { prNumber: 128 },
      correlationId: 'delivery-pr-128',
    });

    const result = processPendingSyncJobs();
    const snapshot = readRuntimeStore();

    expect(result.processedJobs).toBe(1);
    expect(snapshot.syncJobs[0]?.status).toBe('succeeded');
    expect(snapshot.pullRequestRisks['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1']?.status).toBe('succeeded');
    expect(snapshot.reviewRecommendations['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1']?.status).toBe('succeeded');
    expect(snapshot.pullRequests.find((pr) => pr.id === 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1')?.riskLevel).toBeTruthy();
  });
});

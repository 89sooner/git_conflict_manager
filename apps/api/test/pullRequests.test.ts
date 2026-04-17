import { beforeEach, describe, expect, it } from 'vitest';
import { resetRuntimeStore } from '@gsp/runtime-store';
import { createServer } from '../src/index.js';

const DEV_AUTH = { 'x-gsp-dev-user': 'bootstrap' };

beforeEach(() => {
  process.env.GSP_RUNTIME_STORE_FILE = '/tmp/gsp-api-read-model-store.json';
  resetRuntimeStore();
});
const READY_PR_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const PENDING_PR_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
const FAILED_PR_ID = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3';
const REPO_ID = '11111111-1111-4111-8111-111111111111';

describe('GET /api/v1/pull-requests', () => {
  it('returns a paginated seeded list', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/pull-requests',
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as {
        data: unknown[];
        meta: { requestId: string; page: number; pageSize: number; total: number };
      };
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta.page).toBe(1);
      expect(body.meta.total).toBe(3);
      expect(body.meta.requestId).toBeTruthy();
    } finally {
      await app.close();
    }
  });

  it('respects repositoryId and riskLevel filters in query string', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/pull-requests?repositoryId=${REPO_ID}&riskLevel=high&page=1&pageSize=10`,
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as { data: Array<{ id: string }>; meta: { pageSize: number; total: number } };
      expect(body.meta.pageSize).toBe(10);
      expect(body.meta.total).toBe(1);
      expect(body.data[0]?.id).toBe(PENDING_PR_ID);
    } finally {
      await app.close();
    }
  });
});

describe('GET /api/v1/pull-requests/:pullRequestId', () => {
  it('returns PR detail with workflow and gate context', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/pull-requests/${READY_PR_ID}`,
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as {
        data: {
          workflowState: string;
          reviewStatus: { codeOwnersSatisfied: boolean };
          qualityGateStatus: { requiredChecksPassed: boolean };
        };
      };
      expect(body.data.workflowState).toBe('ready-to-merge');
      expect(body.data.reviewStatus.codeOwnersSatisfied).toBe(true);
      expect(body.data.qualityGateStatus.requiredChecksPassed).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('returns 404 with PR_NOT_FOUND for unknown id', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/pull-requests/00000000-0000-0000-0000-000000000099',
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(404);
      const body = response.json() as { error: { code: string } };
      expect(body.error.code).toBe('PR_NOT_FOUND');
    } finally {
      await app.close();
    }
  });
});

describe('GET /api/v1/pull-requests/:pullRequestId/risk-analysis', () => {
  it('returns ready analysis for a PR with completed risk data', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/pull-requests/${READY_PR_ID}/risk-analysis`,
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as { data: { score: number; riskLevel: string } };
      expect(body.data.riskLevel).toBe('medium');
      expect(body.data.score).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });

  it('returns 202 while analysis is running', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/pull-requests/${PENDING_PR_ID}/risk-analysis`,
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(202);
      const body = response.json() as { data: { status: string; jobId: string } };
      expect(body.data.status).toBe('running');
      expect(body.data.jobId).toBeTruthy();
    } finally {
      await app.close();
    }
  });

  it('returns PR_ANALYSIS_FAILED when the latest analysis failed', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/pull-requests/${FAILED_PR_ID}/risk-analysis`,
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(503);
      const body = response.json() as { error: { code: string } };
      expect(body.error.code).toBe('PR_ANALYSIS_FAILED');
    } finally {
      await app.close();
    }
  });
});

describe('GET /api/v1/pull-requests/:pullRequestId/review-recommendations', () => {
  it('returns CODEOWNERS coverage and reviewer suggestions', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/pull-requests/${FAILED_PR_ID}/review-recommendations`,
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as {
        data: { requiredCodeOwners: string[]; recommendedReviewers: unknown[] };
      };
      expect(body.data.requiredCodeOwners.length).toBeGreaterThan(0);
      expect(body.data.recommendedReviewers.length).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });
});

describe('POST /api/v1/pull-requests/assist', () => {
  it('returns a lightweight PR assist payload', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/pull-requests/assist',
        headers: {
          ...DEV_AUTH,
          'content-type': 'application/json',
        },
        payload: {
          repositoryId: REPO_ID,
          sourceBranch: 'feature/boot-order-cleanup',
          baseBranch: 'main',
        },
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as { data: { proposedTitle: string; checklist: string[] } };
      expect(body.data.proposedTitle).toContain('feature: boot-order-cleanup');
      expect(body.data.checklist.length).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });
});

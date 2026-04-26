import { beforeEach, describe, expect, it } from 'vitest';
import { resetRuntimeStore } from '@gsp/runtime-store';
import { createServer } from '../src/index.js';

const DEV_AUTH = { 'x-gsp-dev-user': 'bootstrap' };

beforeEach(() => {
  process.env.GSP_RUNTIME_STORE_FILE = '/tmp/gsp-api-conflict-store.json';
  resetRuntimeStore();
});

const GUIDED_ID = 'dd111111-1111-4111-8111-111111111111';
const ANALYZING_ID = 'dd222222-2222-4222-8222-222222222222';
const STALE_ID = 'dd333333-3333-4333-8333-333333333333';
const REPO_1 = '11111111-1111-4111-8111-111111111111';

describe('GET /api/v1/conflicts', () => {
  it('returns all seeded conflict cases', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/conflicts',
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as {
        data: unknown[];
        meta: { requestId: string; total: number };
      };
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta.total).toBe(3);
      expect(body.meta.requestId).toBeTruthy();
    } finally {
      await app.close();
    }
  });

  it('filters by repositoryId', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/conflicts?repositoryId=${REPO_1}`,
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as { data: Array<{ repositoryId: string }>; meta: { total: number } };
      expect(body.meta.total).toBe(2);
      expect(body.data.every((c) => c.repositoryId === REPO_1)).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('filters by type', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/conflicts?type=merge',
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as { data: Array<{ type: string }>; meta: { total: number } };
      expect(body.meta.total).toBe(1);
      expect(body.data[0]?.type).toBe('merge');
    } finally {
      await app.close();
    }
  });

  it('filters by status', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/conflicts?status=stale',
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as { data: Array<{ status: string }>; meta: { total: number } };
      expect(body.meta.total).toBe(1);
      expect(body.data[0]?.status).toBe('stale');
    } finally {
      await app.close();
    }
  });
});

describe('GET /api/v1/conflicts/:conflictCaseId', () => {
  it('returns guided conflict detail with full context', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/conflicts/${GUIDED_ID}`,
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as {
        data: {
          conflict: { status: string; type: string };
          guidance: string[];
          conflictingFiles: unknown[];
          recoveryActions: string[];
          escalation: { available: boolean };
        };
      };
      expect(body.data.conflict.status).toBe('guided');
      expect(body.data.conflict.type).toBe('merge');
      expect(body.data.guidance.length).toBeGreaterThan(0);
      expect(body.data.conflictingFiles.length).toBe(3);
      expect(body.data.recoveryActions.length).toBeGreaterThan(0);
      expect(body.data.escalation.available).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('returns analyzing conflict with empty guidance', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/conflicts/${ANALYZING_ID}`,
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as {
        data: {
          conflict: { status: string };
          guidance: string[];
          escalation: { available: boolean; disabledReason: string };
        };
      };
      expect(body.data.conflict.status).toBe('analyzing');
      expect(body.data.guidance.length).toBe(0);
      expect(body.data.escalation.available).toBe(false);
      expect(body.data.escalation.disabledReason).toBeTruthy();
    } finally {
      await app.close();
    }
  });

  it('returns stale conflict with warning guidance', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/conflicts/${STALE_ID}`,
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as {
        data: {
          conflict: { status: string };
          guidance: string[];
          interpretedStatus: string;
        };
      };
      expect(body.data.conflict.status).toBe('stale');
      expect(body.data.guidance[0]).toContain('재분석');
      expect(body.data.interpretedStatus).toContain('유효하지 않');
    } finally {
      await app.close();
    }
  });

  it('returns 404 with CONFLICT_CASE_NOT_FOUND for unknown id', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/conflicts/00000000-0000-0000-0000-000000000099',
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(404);
      const body = response.json() as { error: { code: string } };
      expect(body.error.code).toBe('CONFLICT_CASE_NOT_FOUND');
    } finally {
      await app.close();
    }
  });
});

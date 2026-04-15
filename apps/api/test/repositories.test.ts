import { describe, expect, it } from 'vitest';
import { createServer } from '../src/index.js';

const DEV_AUTH = { 'x-gsp-dev-user': 'bootstrap' };
const REPO_ID = '11111111-1111-4111-8111-111111111111';

describe('GET /api/v1/repositories', () => {
  it('returns a paginated seeded list', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories',
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as {
        data: unknown[];
        meta: { requestId: string; timestamp: string; page: number; pageSize: number; total: number };
      };
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta.page).toBe(1);
      expect(body.meta.pageSize).toBe(20);
      expect(body.meta.total).toBe(2);
      expect(body.meta.requestId).toBeTruthy();
    } finally {
      await app.close();
    }
  });

  it('respects page and pageSize query params', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories?page=2&pageSize=1',
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as { data: Array<{ id: string }>; meta: { page: number; pageSize: number } };
      expect(body.meta.page).toBe(2);
      expect(body.meta.pageSize).toBe(1);
      expect(body.data).toHaveLength(1);
    } finally {
      await app.close();
    }
  });

  it('caps pageSize at 100', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories?pageSize=9999',
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as { meta: { pageSize: number } };
      expect(body.meta.pageSize).toBe(100);
    } finally {
      await app.close();
    }
  });
});

describe('GET /api/v1/repositories/:repositoryId', () => {
  it('returns repository summary for a known id', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/repositories/${REPO_ID}`,
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as { data: { fullName: string; openPullRequestCount: number } };
      expect(body.data.fullName).toBe('platform/boot-control');
      expect(body.data.openPullRequestCount).toBe(2);
    } finally {
      await app.close();
    }
  });

  it('returns 404 with REPOSITORY_NOT_FOUND for unknown id', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/00000000-0000-0000-0000-000000000001',
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(404);
      const body = response.json() as { error: { code: string } };
      expect(body.error.code).toBe('REPOSITORY_NOT_FOUND');
    } finally {
      await app.close();
    }
  });
});

describe('GET /api/v1/repositories/:repositoryId/branches', () => {
  it('returns branches for a known repository', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/repositories/${REPO_ID}/branches`,
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as { data: Array<{ name: string }>; meta: { total: number } };
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta.total).toBe(3);
      expect(body.data[0]?.name).toBe('main');
    } finally {
      await app.close();
    }
  });
});

describe('GET /api/v1/repositories/:repositoryId/branches/:branchName', () => {
  it('returns branch detail for a known branch', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/repositories/${REPO_ID}/branches/feature%2Fboot-order-cleanup`,
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as { data: { recommendedActions: string[] } };
      expect(body.data.recommendedActions.length).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });

  it('returns 404 with BRANCH_NOT_FOUND for unknown branch', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/repositories/${REPO_ID}/branches/does-not-exist`,
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(404);
      const body = response.json() as { error: { code: string } };
      expect(body.error.code).toBe('BRANCH_NOT_FOUND');
    } finally {
      await app.close();
    }
  });
});

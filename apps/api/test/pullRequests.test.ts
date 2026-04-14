import { describe, expect, it } from 'vitest';
import { createServer } from '../src/index.js';

const DEV_AUTH = { 'x-gsp-dev-user': 'bootstrap' };

describe('GET /api/v1/pull-requests', () => {
  it('returns an empty paginated list when no data is seeded', async () => {
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
      expect(body.meta.total).toBe(0);
      expect(body.meta.requestId).toBeTruthy();
    } finally {
      await app.close();
    }
  });

  it('respects repositoryId and state filters in query string', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/pull-requests?repositoryId=abc&state=open&page=1&pageSize=10',
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as { meta: { pageSize: number } };
      expect(body.meta.pageSize).toBe(10);
    } finally {
      await app.close();
    }
  });
});

describe('GET /api/v1/pull-requests/:pullRequestId', () => {
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

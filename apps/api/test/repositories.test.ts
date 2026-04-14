import { describe, expect, it } from 'vitest';
import { createServer } from '../src/index.js';

const DEV_AUTH = { 'x-gsp-dev-user': 'bootstrap' };

describe('GET /api/v1/repositories', () => {
  it('returns an empty paginated list when no data is seeded', async () => {
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
      expect(body.meta.total).toBe(0);
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
        url: '/api/v1/repositories?page=2&pageSize=5',
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as { meta: { page: number; pageSize: number } };
      expect(body.meta.page).toBe(2);
      expect(body.meta.pageSize).toBe(5);
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
  it('returns an empty list for unknown repository', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/00000000-0000-0000-0000-000000000001/branches',
        headers: DEV_AUTH,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as { data: unknown[]; meta: { total: number } };
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta.total).toBe(0);
    } finally {
      await app.close();
    }
  });
});

describe('GET /api/v1/repositories/:repositoryId/branches/:branchName', () => {
  it('returns 404 with BRANCH_NOT_FOUND for unknown branch', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/repositories/00000000-0000-0000-0000-000000000001/branches/main',
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

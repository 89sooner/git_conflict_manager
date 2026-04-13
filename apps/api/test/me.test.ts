import { describe, expect, it } from 'vitest';
import { createServer } from '../src/index.js';

const DEV_AUTH = { 'x-gsp-dev-user': 'bootstrap' };

describe('GET /api/v1/me', () => {
  it('returns a standard user profile envelope with request id', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: { ...DEV_AUTH, 'x-request-id': 'test-req-123' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-request-id']).toBe('test-req-123');

      const body = response.json() as {
        data: { user: { login: string }; permissions: string[] };
        meta: { requestId: string; timestamp: string };
      };

      expect(body.data.user.login).toBe('bootstrap-user');
      expect(Array.isArray(body.data.permissions)).toBe(true);
      expect(body.meta.requestId).toBe('test-req-123');
      expect(typeof body.meta.timestamp).toBe('string');
      expect(() => new Date(body.meta.timestamp).toISOString()).not.toThrow();
    } finally {
      await app.close();
    }
  });

  it('generates a request id when none is supplied', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: { ...DEV_AUTH },
      });
      expect(response.statusCode).toBe(200);
      const body = response.json() as { meta: { requestId: string } };
      expect(body.meta.requestId).toMatch(/[0-9a-f-]{10,}/);
      expect(response.headers['x-request-id']).toBe(body.meta.requestId);
    } finally {
      await app.close();
    }
  });

  it('returns 401 AUTH_REQUIRED for anonymous callers', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({ method: 'GET', url: '/api/v1/me' });
      expect(response.statusCode).toBe(401);
      const body = response.json() as {
        error: { code: string; retryable: boolean };
        meta: { requestId: string };
      };
      expect(body.error.code).toBe('AUTH_REQUIRED');
      expect(body.error.retryable).toBe(false);
      expect(body.meta.requestId).toBeTruthy();
    } finally {
      await app.close();
    }
  });
});

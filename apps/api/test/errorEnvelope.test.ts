import { describe, expect, it } from 'vitest';
import { createServer } from '../src/index.js';
import { ApiError } from '../src/lib/errors.js';

describe('standard error envelope', () => {
  it('returns ErrorEnvelope with request id and timestamp for ApiError', async () => {
    const app = createServer({ logger: false });
    app.get('/__test/boom', async () => {
      throw new ApiError({
        code: 'VALIDATION_FAILED',
        message: 'bad payload',
        statusCode: 400,
        retryable: false,
        userAction: 'Fix the payload and retry',
        details: { field: 'name' },
      });
    });

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/__test/boom',
        headers: { 'x-request-id': 'err-req-1' },
      });
      expect(response.statusCode).toBe(400);
      const body = response.json() as {
        error: {
          code: string;
          message: string;
          retryable: boolean;
          userAction?: string;
          details?: Record<string, unknown>;
        };
        meta: { requestId: string; timestamp: string };
      };
      expect(body.error.code).toBe('VALIDATION_FAILED');
      expect(body.error.retryable).toBe(false);
      expect(body.error.userAction).toBe('Fix the payload and retry');
      expect(body.error.details).toEqual({ field: 'name' });
      expect(body.meta.requestId).toBe('err-req-1');
      expect(typeof body.meta.timestamp).toBe('string');
    } finally {
      await app.close();
    }
  });

  it('returns INVALID_REQUEST envelope for unknown routes', async () => {
    const app = createServer({ logger: false });
    try {
      const response = await app.inject({ method: 'GET', url: '/__nope' });
      expect(response.statusCode).toBe(404);
      const body = response.json() as { error: { code: string }; meta: { requestId: string } };
      expect(body.error.code).toBe('INVALID_REQUEST');
      expect(body.meta.requestId).toBeTruthy();
    } finally {
      await app.close();
    }
  });

  it('normalizes unknown thrown errors to INTERNAL_SERVER_ERROR', async () => {
    const app = createServer({ logger: false });
    app.get('/__test/kaboom', async () => {
      throw new Error('something exploded');
    });
    try {
      const response = await app.inject({ method: 'GET', url: '/__test/kaboom' });
      expect(response.statusCode).toBe(500);
      const body = response.json() as {
        error: { code: string; message: string; retryable: boolean };
      };
      expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(body.error.message).toBe('Internal server error');
      expect(body.error.retryable).toBe(true);
    } finally {
      await app.close();
    }
  });
});

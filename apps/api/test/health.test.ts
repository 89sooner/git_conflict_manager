import { describe, expect, it } from 'vitest';
import { createServer } from '../src/index.js';

describe('health route', () => {
  it('returns ok', async () => {
    const app = createServer();
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', service: 'api' });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listPullRequests } from '../pullRequests';

describe('pullRequests api helpers', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.API_BASE_URL_INTERNAL = 'http://api.test:4000';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('serializes the list filter as riskLevel instead of the legacy risk key', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ data: [], meta: { requestId: 'req-1' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await listPullRequests({ page: 2, pageSize: 20, riskLevel: 'critical' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit?][];
    const url = String(calls.at(0)?.[0] ?? '');
    expect(url).toContain('page=2');
    expect(url).toContain('pageSize=20');
    expect(url).toContain('riskLevel=critical');
    expect(url).not.toContain('risk=');
  });
});

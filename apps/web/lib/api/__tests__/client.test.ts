import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../client';
import { ApiClientError } from '../errors';

describe('apiFetch', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.API_BASE_URL_INTERNAL = 'http://api.test:4000';
    process.env.GSP_DEV_USER = 'bootstrap';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  type FetchCall = [input: string, init: RequestInit];

  function mockFetch(response: { status: number; body: unknown; contentType?: string }) {
    const fetchMock = vi.fn(async (_input: string, _init?: RequestInit) => {
      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: { 'content-type': response.contentType ?? 'application/json' },
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
  }

  function firstCall(mock: ReturnType<typeof mockFetch>): FetchCall {
    const calls = mock.mock.calls as unknown as FetchCall[];
    if (calls.length === 0) throw new Error('fetch was not called');
    return calls[0]!;
  }

  it('builds URL with base + query and returns parsed JSON on 200', async () => {
    const fetchMock = mockFetch({
      status: 200,
      body: {
        data: [],
        meta: { requestId: 'req-1', total: 0, page: 1, pageSize: 20 },
      },
    });

    const result = await apiFetch<{ data: unknown[]; meta: { total: number } }>(
      '/api/v1/repositories',
      { query: { page: 1, pageSize: 20 } },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl] = firstCall(fetchMock);
    expect(calledUrl).toBe('http://api.test:4000/api/v1/repositories?page=1&pageSize=20');
    expect(result.meta.total).toBe(0);
  });

  it('falls back to the API default port when no base-url env vars are set', async () => {
    delete process.env.API_BASE_URL_INTERNAL;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;

    const fetchMock = mockFetch({
      status: 200,
      body: {
        data: [],
        meta: { requestId: 'req-default', total: 0, page: 1, pageSize: 20 },
      },
    });

    await apiFetch('/api/v1/repositories');

    const [calledUrl] = firstCall(fetchMock);
    expect(calledUrl).toBe('http://localhost:4000/api/v1/repositories');
  });

  it('injects x-gsp-dev-user header on the server when GSP_DEV_USER is set', async () => {
    const fetchMock = mockFetch({
      status: 200,
      body: { data: [], meta: { requestId: 'req-2' } },
    });

    await apiFetch('/api/v1/repositories');

    const [, init] = firstCall(fetchMock);
    const headers = init.headers as Record<string, string>;
    expect(headers['x-gsp-dev-user']).toBe('bootstrap');
  });

  it('omits dev header when GSP_DEV_USER is not set', async () => {
    delete process.env.GSP_DEV_USER;
    const fetchMock = mockFetch({
      status: 200,
      body: { data: [], meta: { requestId: 'req-3' } },
    });

    await apiFetch('/api/v1/repositories');

    const [, init] = firstCall(fetchMock);
    const headers = init.headers as Record<string, string>;
    expect(headers['x-gsp-dev-user']).toBeUndefined();
  });

  it('omits dev header when GSP_DEV_USER is set to a value the API does not accept', async () => {
    // Regression: previously any non-empty value was forwarded, which let the
    // shell present an "authenticated" UI while the API silently rejected the
    // unknown token. The web client must only inject the bootstrap token that
    // apps/api/src/plugins/auth.ts is wired to honor.
    process.env.GSP_DEV_USER = 'someone-else';
    const fetchMock = mockFetch({
      status: 200,
      body: { data: [], meta: { requestId: 'req-3b' } },
    });

    await apiFetch('/api/v1/repositories');

    const [, init] = firstCall(fetchMock);
    const headers = init.headers as Record<string, string>;
    expect(headers['x-gsp-dev-user']).toBeUndefined();
  });

  it('throws ApiClientError with parsed envelope on non-2xx JSON response', async () => {
    mockFetch({
      status: 404,
      body: {
        error: {
          code: 'REPOSITORY_NOT_FOUND',
          message: 'Repository not found',
          retryable: false,
          userAction: 'GitHub App을 확인하세요.',
        },
        meta: { requestId: 'req-4' },
      },
    });

    await expect(apiFetch('/api/v1/repositories/missing')).rejects.toMatchObject({
      name: 'ApiClientError',
      code: 'REPOSITORY_NOT_FOUND',
      status: 404,
      retryable: false,
      userAction: 'GitHub App을 확인하세요.',
    });
  });

  it('throws ApiClientError with INTERNAL_SERVER_ERROR for non-envelope error bodies', async () => {
    mockFetch({ status: 500, body: { unrelated: true } });

    const error = await apiFetch('/api/v1/repositories').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiClientError);
    const apiError = error as ApiClientError;
    expect(apiError.code).toBe('INTERNAL_SERVER_ERROR');
    expect(apiError.status).toBe(500);
    expect(apiError.retryable).toBe(true);
  });

  it('wraps fetch transport errors as DEPENDENCY_UNAVAILABLE', async () => {
    globalThis.fetch = (async () => {
      throw new TypeError('network down');
    }) as unknown as typeof fetch;

    const error = await apiFetch('/api/v1/repositories').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiClientError);
    const apiError = error as ApiClientError;
    expect(apiError.code).toBe('DEPENDENCY_UNAVAILABLE');
    expect(apiError.retryable).toBe(true);
  });
});

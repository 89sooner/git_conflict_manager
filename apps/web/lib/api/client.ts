import { DEV_USER_BOOTSTRAP_TOKEN, DEV_USER_HEADER } from '@gsp/shared-types';
import { ApiClientError, parseErrorEnvelope } from './errors';

export type QueryValue = string | number | boolean | undefined | null;
export type QueryParams = Record<string, QueryValue>;

/**
 * Subset of `RequestInit` that this client supports.
 *
 * `headers` is intentionally narrowed to a plain `Record<string, string>` so
 * that the merge in `apiFetch` is safe: `Headers` instances and tuple-array
 * forms cannot reach this code path, which means callers can never silently
 * lose values during the spread.
 *
 * `body` is `unknown` because we always JSON-serialize on behalf of the caller.
 */
export interface ApiFetchOptions extends Omit<RequestInit, 'body' | 'headers'> {
  query?: QueryParams;
  body?: unknown;
  headers?: Record<string, string>;
}

const DEFAULT_BASE_URL = 'http://localhost:4000';

function resolveBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.API_BASE_URL_INTERNAL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL;
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL;
}

/**
 * Inject the dev auth header on the server when (and only when) the env var
 * matches the API-accepted bootstrap token. Any other value is dropped so the
 * UI and API never disagree on identity — see ADR-0001 Decision 2.
 */
function resolveDevHeader(): Record<string, string> {
  if (typeof window !== 'undefined') return {};
  const devUser = process.env.GSP_DEV_USER;
  if (devUser === DEV_USER_BOOTSTRAP_TOKEN) {
    return { [DEV_USER_HEADER]: devUser };
  }
  return {};
}

function buildUrl(path: string, query?: ApiFetchOptions['query']): string {
  const base = resolveBaseUrl().replace(/\/$/, '');
  const url = new URL(path.startsWith('/') ? path : `/${path}`, `${base}/`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { query, body, headers, ...rest } = options;
  const url = buildUrl(path, query);

  const mergedHeaders: Record<string, string> = {
    accept: 'application/json',
    ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    ...resolveDevHeader(),
    ...(headers ?? {}),
  };

  const init: RequestInit = {
    ...rest,
    headers: mergedHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: rest.cache ?? 'no-store',
  };

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (cause) {
    throw new ApiClientError(
      {
        code: 'DEPENDENCY_UNAVAILABLE',
        message: cause instanceof Error ? cause.message : 'Network request failed',
        retryable: true,
      },
      0,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload: unknown = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const apiError = parseErrorEnvelope(payload, response.status);
    if (apiError) throw apiError;
    throw new ApiClientError(
      {
        code: 'INTERNAL_SERVER_ERROR',
        message: `Unexpected ${response.status} response from ${url}`,
        retryable: response.status >= 500,
      },
      response.status,
    );
  }

  return payload as T;
}

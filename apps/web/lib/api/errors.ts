import type { ApiMeta, ErrorBody, ErrorCode, ErrorEnvelope } from '@gsp/shared-types';

export class ApiClientError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly userAction?: string;
  readonly details?: Record<string, unknown>;
  readonly meta?: ApiMeta;

  constructor(body: ErrorBody, status: number, meta?: ApiMeta) {
    super(body.message);
    this.name = 'ApiClientError';
    this.code = body.code;
    this.status = status;
    this.retryable = body.retryable;
    this.userAction = body.userAction;
    this.details = body.details;
    this.meta = meta;
  }
}

export function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.error !== 'object' || v.error === null) return false;
  const err = v.error as Record<string, unknown>;
  return typeof err.code === 'string' && typeof err.message === 'string' && typeof err.retryable === 'boolean';
}

export function parseErrorEnvelope(value: unknown, status: number): ApiClientError | null {
  if (!isErrorEnvelope(value)) return null;
  return new ApiClientError(value.error, status, value.meta);
}

export interface NormalizedError {
  code: string;
  message: string;
  retryable: boolean;
  userAction?: string;
}

const FALLBACK_MESSAGE = '알 수 없는 오류가 발생했습니다.';

/**
 * Reduce any thrown value into the shape `ErrorState` renders. Centralized so
 * that the behavior is unit-testable without mounting a React component.
 *
 * - `ApiClientError` is the structured envelope path: pass through.
 * - Native `Error` becomes a generic `UNKNOWN_ERROR` with the original message.
 * - Anything else (string, undefined, plain object) collapses to the same
 *   generic fallback so callers never leak `[object Object]` to users.
 */
export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof ApiClientError) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      userAction: error.userAction,
    };
  }
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || FALLBACK_MESSAGE,
      retryable: true,
    };
  }
  return {
    code: 'UNKNOWN_ERROR',
    message: FALLBACK_MESSAGE,
    retryable: true,
  };
}

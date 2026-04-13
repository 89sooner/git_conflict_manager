import type { ErrorCode } from '@gsp/shared-types';

export interface ApiErrorInit {
  code: ErrorCode;
  message: string;
  statusCode: number;
  retryable?: boolean;
  userAction?: string;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly retryable: boolean;
  readonly userAction?: string;
  readonly details?: Record<string, unknown>;

  constructor(init: ApiErrorInit) {
    super(init.message, init.cause ? { cause: init.cause } : undefined);
    this.name = 'ApiError';
    this.code = init.code;
    this.statusCode = init.statusCode;
    this.retryable = init.retryable ?? false;
    this.userAction = init.userAction;
    this.details = init.details;
  }
}

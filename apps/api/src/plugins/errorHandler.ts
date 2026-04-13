import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ErrorCode, ErrorEnvelope } from '@gsp/shared-types';
import { ApiError } from '../lib/errors.js';

interface NormalizedError {
  statusCode: number;
  code: ErrorCode;
  message: string;
  retryable: boolean;
  userAction?: string;
  details?: Record<string, unknown>;
}

function normalize(error: unknown): NormalizedError {
  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      userAction: error.userAction,
      details: error.details,
    };
  }

  const fastifyError = error as FastifyError | undefined;
  if (fastifyError?.validation) {
    return {
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: fastifyError.message ?? 'Request validation failed',
      retryable: false,
      details: { validation: fastifyError.validation },
    };
  }

  const statusCode =
    typeof fastifyError?.statusCode === 'number' && fastifyError.statusCode >= 400
      ? fastifyError.statusCode
      : 500;

  if (statusCode === 404) {
    return {
      statusCode,
      code: 'INVALID_REQUEST',
      message: fastifyError?.message ?? 'Route not found',
      retryable: false,
    };
  }

  if (statusCode === 401) {
    return {
      statusCode,
      code: 'AUTH_REQUIRED',
      message: fastifyError?.message ?? 'Authentication required',
      retryable: false,
    };
  }

  if (statusCode === 403) {
    return {
      statusCode,
      code: 'PERMISSION_DENIED',
      message: fastifyError?.message ?? 'Permission denied',
      retryable: false,
    };
  }

  if (statusCode < 500) {
    return {
      statusCode,
      code: 'INVALID_REQUEST',
      message: fastifyError?.message ?? 'Bad request',
      retryable: false,
    };
  }

  return {
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
    retryable: true,
  };
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: unknown, request: FastifyRequest, reply: FastifyReply) => {
    const normalized = normalize(error);

    if (normalized.statusCode >= 500) {
      request.log.error({ err: error, reqId: request.id }, normalized.message);
    } else {
      request.log.warn({ err: error, reqId: request.id }, normalized.message);
    }

    const envelope: ErrorEnvelope = {
      error: {
        code: normalized.code,
        message: normalized.message,
        retryable: normalized.retryable,
        ...(normalized.userAction ? { userAction: normalized.userAction } : {}),
        ...(normalized.details ? { details: normalized.details } : {}),
      },
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    };

    reply.status(normalized.statusCode).send(envelope);
  });

  app.setNotFoundHandler((request, reply) => {
    const envelope: ErrorEnvelope = {
      error: {
        code: 'INVALID_REQUEST',
        message: `Route ${request.method} ${request.url} not found`,
        retryable: false,
      },
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    };
    reply.status(404).send(envelope);
  });
}

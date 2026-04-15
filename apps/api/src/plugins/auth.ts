import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  BOOTSTRAP_DEV_USER,
  DEV_USER_BOOTSTRAP_TOKEN,
  DEV_USER_HEADER,
  type UserSummary,
} from '@gsp/shared-types';

export interface AuthContext {
  user: UserSummary;
  permissions: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

/**
 * Phase 2 auth placeholder.
 *
 * Real JWT/SSO wiring lands in a later phase. Until then, the plugin only
 * populates `request.auth` when the caller opts in via the dev header.
 * Anonymous callers keep `request.auth === undefined`, which lets the
 * `/api/v1/me` handler return the documented `401 AUTH_REQUIRED` envelope.
 *
 * Do NOT default-inject a user here — that would silently turn anonymous
 * traffic into authenticated traffic on any future protected route.
 */
const BOOTSTRAP_CONTEXT: AuthContext = {
  user: { ...BOOTSTRAP_DEV_USER },
  permissions: [],
};

export function registerAuth(app: FastifyInstance) {
  app.addHook('onRequest', async (request: FastifyRequest) => {
    const header = request.headers[DEV_USER_HEADER];
    if (typeof header === 'string' && header === DEV_USER_BOOTSTRAP_TOKEN) {
      request.auth = BOOTSTRAP_CONTEXT;
    }
  });
}

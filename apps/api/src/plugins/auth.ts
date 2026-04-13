import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { UserSummary } from '@gsp/shared-types';

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
 * populates `request.auth` when the caller opts in via the `x-gsp-dev-user`
 * header. Anonymous callers keep `request.auth === undefined`, which lets the
 * `/api/v1/me` handler return the documented `401 AUTH_REQUIRED` envelope.
 *
 * Do NOT default-inject a user here — that would silently turn anonymous
 * traffic into authenticated traffic on any future protected route.
 */
const DEV_USER_HEADER = 'x-gsp-dev-user';

const BOOTSTRAP_CONTEXT: AuthContext = {
  user: {
    id: '00000000-0000-0000-0000-000000000000',
    login: 'bootstrap-user',
    displayName: 'Bootstrap User',
    email: null,
  },
  permissions: [],
};

export function registerAuth(app: FastifyInstance) {
  app.addHook('onRequest', async (request: FastifyRequest) => {
    const header = request.headers[DEV_USER_HEADER];
    if (typeof header === 'string' && header === 'bootstrap') {
      request.auth = BOOTSTRAP_CONTEXT;
    }
  });
}

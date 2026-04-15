// Server-only module: never imported into client components.
// Phase 10 will replace this with a real session resolver (SSO/OIDC).

import {
  BOOTSTRAP_DEV_USER,
  DEV_USER_BOOTSTRAP_TOKEN,
  type UserSummary,
} from '@gsp/shared-types';

export interface DevSession {
  kind: 'dev';
  user: UserSummary;
}

export type Session = DevSession;

/**
 * Resolve the current session for server-side rendering.
 *
 * Phase 5 (T-014): dev mode only. When `GSP_DEV_USER=bootstrap` is set, every
 * server fetch carries `x-gsp-dev-user: bootstrap` and the API resolves the
 * caller to the canonical bootstrap user (see `apps/api/src/plugins/auth.ts`).
 * Both sides import the same `BOOTSTRAP_DEV_USER` from `@gsp/shared-types` to
 * keep the AppShell display and `/api/v1/me` payload aligned.
 *
 * Any other value of `GSP_DEV_USER` is treated as anonymous on both sides:
 * the API rejects unknown tokens, and the web client never injects them.
 *
 * SSO/OIDC integration is intentionally deferred to Phase 10 hardening; see
 * `docs/05-decisions/adr-0001-web-data-fetching-strategy.md` (Decision 2).
 */
export function getSession(): Session | null {
  const devUser = process.env.GSP_DEV_USER;
  if (devUser === DEV_USER_BOOTSTRAP_TOKEN) {
    return { kind: 'dev', user: { ...BOOTSTRAP_DEV_USER } };
  }
  return null;
}

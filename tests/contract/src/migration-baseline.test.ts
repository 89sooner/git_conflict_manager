import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATION_PATH = resolve(
  process.cwd(),
  '../../apps/api/src/db/migrations/0001_baseline.sql',
);

const PR_BUSINESS_STATES = [
  'draft',
  'open',
  'under-review',
  'changes-requested',
  'approved',
  'merge-blocked',
  'ready-to-merge',
  'queued-for-merge',
  'merged',
  'closed',
  'reverted',
];

const REQUIRED_TABLES = [
  'core_organizations',
  'core_users',
  'core_repositories',
  'core_pull_requests',
  'integration_webhook_events',
  'integration_sync_jobs',
];

describe('apps/api/src/db/migrations/0001_baseline.sql', () => {
  it('exists', () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);
  });

  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  it('creates every required baseline table', () => {
    for (const table of REQUIRED_TABLES) {
      expect(sql).toContain(`create table if not exists ${table}`);
    }
  });

  it('encodes the full PR business state machine on core_pull_requests.state', () => {
    for (const state of PR_BUSINESS_STATES) {
      expect(sql).toContain(`'${state}'`);
    }
  });

  it('constrains integration_sync_jobs.status to the job state machine', () => {
    expect(sql).toMatch(
      /status\s+text[^]*?check\s*\(\s*status\s+in\s*\(\s*'queued',\s*'running',\s*'succeeded',\s*'failed',\s*'cancelled'/,
    );
  });
});

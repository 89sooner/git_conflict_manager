import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATION_PATH = resolve(
  process.cwd(),
  '../../apps/api/src/db/migrations/0002_pr_analysis_read_models.sql',
);

describe('apps/api/src/db/migrations/0002_pr_analysis_read_models.sql', () => {
  it('exists', () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);
  });

  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  it('creates PR risk and review recommendation read-model tables', () => {
    expect(sql).toContain('create table if not exists core_pull_request_risks');
    expect(sql).toContain('create table if not exists core_pull_request_review_recommendations');
  });

  it('encodes analysis and recommendation job states', () => {
    expect(sql).toContain("'queued'");
    expect(sql).toContain("'running'");
    expect(sql).toContain("'succeeded'");
    expect(sql).toContain("'failed'");
    expect(sql).toContain("'stale'");
  });
});

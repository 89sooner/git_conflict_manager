import { beforeEach, describe, expect, it } from 'vitest';
import { resetRuntimeStore } from '@gsp/runtime-store';
import { createServer } from '../src/index.js';

const DEV_AUTH = { 'x-gsp-dev-user': 'bootstrap' };

beforeEach(() => {
  process.env.GSP_RUNTIME_STORE_FILE = '/tmp/gsp-api-backout-store.json';
  resetRuntimeStore();
});

const DRAFT_ID = 'ee111111-1111-4111-8111-111111111111';
const PENDING_ID = 'ee222222-2222-4222-8222-222222222222';
const MERGED_ID = 'ee333333-3333-4333-8333-333333333333';
const REPO_1 = '11111111-1111-4111-8111-111111111111';

// ── List ────────────────────────────────────────────────────────────────────

describe('GET /api/v1/backouts', () => {
  it('returns all seeded backout requests', async () => {
    const app = createServer({ logger: false });
    try {
      const res = await app.inject({ method: 'GET', url: '/api/v1/backouts', headers: DEV_AUTH });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { data: unknown[]; meta: { total: number } };
      expect(body.data.length).toBe(3);
      expect(body.meta.total).toBe(3);
    } finally {
      await app.close();
    }
  });

  it('filters by repositoryId', async () => {
    const app = createServer({ logger: false });
    try {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/backouts?repositoryId=${REPO_1}`,
        headers: DEV_AUTH,
      });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { data: Array<{ repositoryId: string }>; meta: { total: number } };
      expect(body.meta.total).toBe(2);
      expect(body.data.every((b) => b.repositoryId === REPO_1)).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('filters by status', async () => {
    const app = createServer({ logger: false });
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/backouts?status=draft',
        headers: DEV_AUTH,
      });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { data: Array<{ status: string }>; meta: { total: number } };
      expect(body.meta.total).toBe(1);
      expect(body.data[0]?.status).toBe('draft');
    } finally {
      await app.close();
    }
  });

  it('filters by branchKind=release', async () => {
    const app = createServer({ logger: false });
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/backouts?branchKind=release',
        headers: DEV_AUTH,
      });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { data: Array<{ targetBranch: string }> };
      expect(body.data.length).toBe(1);
      expect(body.data[0]?.targetBranch).toMatch(/^release\//);
    } finally {
      await app.close();
    }
  });
});

// ── Detail ──────────────────────────────────────────────────────────────────

describe('GET /api/v1/backouts/:backoutId', () => {
  it('returns draft backout detail', async () => {
    const app = createServer({ logger: false });
    try {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/backouts/${DRAFT_ID}`,
        headers: DEV_AUTH,
      });
      expect(res.statusCode).toBe(200);
      const body = res.json() as {
        data: {
          backout: { status: string; urgency: string };
          target: { sourceType: string };
          impactedModules: string[];
        };
      };
      expect(body.data.backout.status).toBe('draft');
      expect(body.data.backout.urgency).toBe('normal');
      expect(body.data.target.sourceType).toBe('pull_request');
      expect(body.data.impactedModules.length).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });

  it('returns merged backout with revert PR', async () => {
    const app = createServer({ logger: false });
    try {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/backouts/${MERGED_ID}`,
        headers: DEV_AUTH,
      });
      expect(res.statusCode).toBe(200);
      const body = res.json() as {
        data: {
          backout: { status: string; urgency: string };
          revertPullRequest: { number: number; state: string } | null;
        };
      };
      expect(body.data.backout.status).toBe('merged');
      expect(body.data.backout.urgency).toBe('emergency');
      expect(body.data.revertPullRequest).not.toBeNull();
      expect(body.data.revertPullRequest!.state).toBe('merged');
    } finally {
      await app.close();
    }
  });

  it('returns 404 with BACKOUT_NOT_FOUND for unknown id', async () => {
    const app = createServer({ logger: false });
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/backouts/00000000-0000-0000-0000-000000000099',
        headers: DEV_AUTH,
      });
      expect(res.statusCode).toBe(404);
      const body = res.json() as { error: { code: string } };
      expect(body.error.code).toBe('BACKOUT_NOT_FOUND');
    } finally {
      await app.close();
    }
  });
});

// ── Create ──────────────────────────────────────────────────────────────────

describe('POST /api/v1/backouts', () => {
  it('creates a backout request successfully', async () => {
    const app = createServer({ logger: false });
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/backouts',
        headers: { ...DEV_AUTH, 'content-type': 'application/json' },
        payload: {
          repositoryId: REPO_1,
          targetBranch: 'main',
          reason: 'Build failure after merge',
          incidentTicket: 'INC-999',
          urgency: 'normal',
          approverIds: [],
          target: { sourceType: 'commit_list', pullRequestId: null, commitShas: ['abc1234'] },
        },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json() as {
        data: { backout: { status: string; targetBranch: string }; target: { commitShas: string[] } };
      };
      expect(body.data.backout.status).toBe('draft');
      expect(body.data.backout.targetBranch).toBe('main');
      expect(body.data.target.commitShas).toContain('abc1234');
    } finally {
      await app.close();
    }
  });

  it('rejects missing reason with BACKOUT_REASON_REQUIRED', async () => {
    const app = createServer({ logger: false });
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/backouts',
        headers: { ...DEV_AUTH, 'content-type': 'application/json' },
        payload: {
          repositoryId: REPO_1,
          targetBranch: 'main',
          reason: '',
          urgency: 'normal',
          approverIds: [],
          target: { sourceType: 'commit_list', pullRequestId: null, commitShas: ['abc'] },
        },
      });
      expect(res.statusCode).toBe(422);
      const body = res.json() as { error: { code: string } };
      expect(body.error.code).toBe('BACKOUT_REASON_REQUIRED');
    } finally {
      await app.close();
    }
  });

  it('rejects empty target with BACKOUT_TARGET_REQUIRED', async () => {
    const app = createServer({ logger: false });
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/backouts',
        headers: { ...DEV_AUTH, 'content-type': 'application/json' },
        payload: {
          repositoryId: REPO_1,
          targetBranch: 'main',
          reason: 'Some reason',
          urgency: 'normal',
          approverIds: [],
          target: { sourceType: 'commit_list', pullRequestId: null, commitShas: [] },
        },
      });
      expect(res.statusCode).toBe(422);
      const body = res.json() as { error: { code: string } };
      expect(body.error.code).toBe('BACKOUT_TARGET_REQUIRED');
    } finally {
      await app.close();
    }
  });

  it('rejects release branch without approvers with BACKOUT_APPROVER_REQUIRED', async () => {
    const app = createServer({ logger: false });
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/backouts',
        headers: { ...DEV_AUTH, 'content-type': 'application/json' },
        payload: {
          repositoryId: REPO_1,
          targetBranch: 'release/2026.05',
          reason: 'Hotfix regression',
          urgency: 'high',
          approverIds: [],
          target: { sourceType: 'commit_list', pullRequestId: null, commitShas: ['def5678'] },
        },
      });
      expect(res.statusCode).toBe(422);
      const body = res.json() as { error: { code: string } };
      expect(body.error.code).toBe('BACKOUT_APPROVER_REQUIRED');
    } finally {
      await app.close();
    }
  });
});

// ── Generate Revert PR ──────────────────────────────────────────────────────

describe('POST /api/v1/backouts/:backoutId/generate-revert-pr', () => {
  it('dry-run returns canGenerate=true without creating PR', async () => {
    const app = createServer({ logger: false });
    try {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/backouts/${DRAFT_ID}/generate-revert-pr`,
        headers: { ...DEV_AUTH, 'content-type': 'application/json' },
        payload: { dryRun: true },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json() as {
        data: { dryRun: boolean; canGenerate: boolean; pullRequest: unknown };
      };
      expect(body.data.dryRun).toBe(true);
      expect(body.data.canGenerate).toBe(true);
      expect(body.data.pullRequest).toBeNull();
    } finally {
      await app.close();
    }
  });

  it('actual run returns placeholder revert PR', async () => {
    const app = createServer({ logger: false });
    try {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/backouts/${DRAFT_ID}/generate-revert-pr`,
        headers: { ...DEV_AUTH, 'content-type': 'application/json' },
        payload: { dryRun: false },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json() as {
        data: { dryRun: boolean; canGenerate: boolean; pullRequest: { title: string } | null };
      };
      expect(body.data.dryRun).toBe(false);
      expect(body.data.canGenerate).toBe(true);
      expect(body.data.pullRequest).not.toBeNull();
      expect(body.data.pullRequest!.title).toContain('Revert');
    } finally {
      await app.close();
    }
  });

  it('returns BACKOUT_RELEASE_POLICY_BLOCKED for draft release backout', async () => {
    // Create a draft backout on a release branch first
    const app = createServer({ logger: false });
    try {
      // Create
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/backouts',
        headers: { ...DEV_AUTH, 'content-type': 'application/json' },
        payload: {
          repositoryId: REPO_1,
          targetBranch: 'release/2026.06',
          reason: 'Test policy block',
          urgency: 'normal',
          approverIds: ['approver-1'],
          target: { sourceType: 'commit_list', pullRequestId: null, commitShas: ['xyz999'] },
        },
      });
      expect(createRes.statusCode).toBe(201);
      const createdId = (createRes.json() as { data: { backout: { id: string } } }).data.backout.id;

      // Try generate revert PR — should be blocked
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/backouts/${createdId}/generate-revert-pr`,
        headers: { ...DEV_AUTH, 'content-type': 'application/json' },
        payload: { dryRun: false },
      });
      expect(res.statusCode).toBe(409);
      const body = res.json() as { error: { code: string } };
      expect(body.error.code).toBe('BACKOUT_RELEASE_POLICY_BLOCKED');
    } finally {
      await app.close();
    }
  });
});

import { describe, it, expect } from 'vitest';
import type {
  BackoutSummary,
  BackoutDetailResponse,
  BackoutListResponse,
  BackoutState,
  BackoutUrgency,
  CreateBackoutRequest,
  GenerateRevertPullRequestResponse,
} from '@gsp/shared-types';

const STATES: BackoutState[] = [
  'draft',
  'validating',
  'pending-approval',
  'approved',
  'blocked',
  'ready',
  'pr-generating',
  'pr-open',
  'queued-for-merge',
  'merged',
  'failed',
  'cancelled',
];

const URGENCIES: BackoutUrgency[] = ['normal', 'high', 'emergency'];

function makeBackoutSummary(overrides: Partial<BackoutSummary> = {}): BackoutSummary {
  return {
    id: 'b-123',
    repositoryId: 'r-123',
    targetBranch: 'main',
    status: 'draft',
    urgency: 'normal',
    createdBy: {
      id: 'u-1',
      login: 'alice',
      displayName: 'Alice',
      email: null,
    },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Backout domain shapes', () => {
  it('BackoutSummary covers all 12 states and 3 urgencies', () => {
    for (const state of STATES) {
      expect(() => makeBackoutSummary({ status: state })).not.toThrow();
    }
    for (const urgency of URGENCIES) {
      expect(() => makeBackoutSummary({ urgency })).not.toThrow();
    }
  });

  it('CreateBackoutRequest supports PR target', () => {
    const req: CreateBackoutRequest = {
      repositoryId: 'r-123',
      targetBranch: 'main',
      reason: 'test',
      incidentTicket: null,
      urgency: 'normal',
      approverIds: [],
      target: {
        sourceType: 'pull_request',
        pullRequestId: 'pr-123',
        commitShas: [],
      },
    };
    expect(req.target.sourceType).toBe('pull_request');
    expect(req.target.pullRequestId).toBe('pr-123');
  });

  it('CreateBackoutRequest supports commit list target', () => {
    const req: CreateBackoutRequest = {
      repositoryId: 'r-123',
      targetBranch: 'main',
      reason: 'test',
      incidentTicket: null,
      urgency: 'normal',
      approverIds: [],
      target: {
        sourceType: 'commit_list',
        pullRequestId: null,
        commitShas: ['abc1234', 'def5678'],
      },
    };
    expect(req.target.sourceType).toBe('commit_list');
    expect(req.target.commitShas.length).toBe(2);
  });
});

describe('Backout API envelopes', () => {
  it('BackoutListResponse wraps array with meta', () => {
    const resp: BackoutListResponse = {
      data: [makeBackoutSummary()],
      meta: { requestId: 'r1', timestamp: new Date().toISOString(), total: 1 },
    };
    expect(resp.data[0]?.status).toBe('draft');
    expect(resp.meta.total).toBe(1);
  });

  it('BackoutDetailResponse includes target and impact info', () => {
    const resp: BackoutDetailResponse = {
      data: {
        backout: makeBackoutSummary(),
        target: { sourceType: 'pull_request', pullRequestId: 'pr-1', commitShas: [] },
        impactSummary: 'Reverts boot sequence change',
        impactedModules: ['boot'],
        recommendedValidations: ['run ci'],
        revertPullRequest: null,
      },
      meta: { requestId: 'r1', timestamp: new Date().toISOString() },
    };
    expect(resp.data.impactedModules[0]).toBe('boot');
    expect(resp.data.revertPullRequest).toBeNull();
  });

  it('GenerateRevertPullRequestResponse models dry-run and warnings', () => {
    const resp: GenerateRevertPullRequestResponse = {
      data: {
        dryRun: true,
        canGenerate: true,
        pullRequest: null,
        warnings: ['Multiple commits selected'],
      },
      meta: { requestId: 'r1', timestamp: new Date().toISOString() },
    };
    expect(resp.data.warnings[0]).toContain('Multiple');
  });
});

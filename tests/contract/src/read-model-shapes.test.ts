import { describe, it, expect } from 'vitest';
import type {
  RepositorySummary,
  BranchSummary,
  PullRequestSummary,
  RepositoryListResponse,
  BranchListResponse,
  PullRequestListResponse,
  RepositoryVisibility,
  BranchKind,
  PullRequestViewState,
} from '@gsp/shared-types';

const VISIBILITY_VALUES: RepositoryVisibility[] = ['private', 'internal', 'public'];
const BRANCH_KIND_VALUES: BranchKind[] = ['default', 'release', 'feature', 'hotfix', 'other'];
const PR_VIEW_STATES: PullRequestViewState[] = ['open', 'closed', 'merged', 'draft'];

function makeRepo(overrides: Partial<RepositorySummary> = {}): RepositorySummary {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    githubNodeId: 'R_abc',
    name: 'my-repo',
    fullName: 'acme/my-repo',
    defaultBranch: 'main',
    visibility: 'private',
    teamName: null,
    riskLevel: 'low',
    openPullRequestCount: 0,
    staleBranchCount: 0,
    ...overrides,
  };
}

function makeBranch(overrides: Partial<BranchSummary> = {}): BranchSummary {
  return {
    name: 'main',
    kind: 'default',
    isProtected: true,
    isStale: false,
    aheadBy: 0,
    behindBy: 0,
    latestCommitSha: 'abc123',
    ...overrides,
  };
}

function makePR(overrides: Partial<PullRequestSummary> = {}): PullRequestSummary {
  return {
    id: '00000000-0000-0000-0000-000000000002',
    number: 1,
    title: 'feat: add something',
    state: 'open',
    author: { id: '00000000-0000-0000-0000-000000000003', login: 'alice', displayName: 'Alice', email: null },
    baseBranch: 'main',
    headBranch: 'feature/x',
    riskLevel: 'low',
    hasConflicts: false,
    waitingForReview: false,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('RepositorySummary shape', () => {
  it('has all required fields with correct types', () => {
    const r = makeRepo();
    expect(typeof r.id).toBe('string');
    expect(typeof r.name).toBe('string');
    expect(typeof r.fullName).toBe('string');
    expect(typeof r.defaultBranch).toBe('string');
    expect(typeof r.openPullRequestCount).toBe('number');
    expect(typeof r.staleBranchCount).toBe('number');
  });

  it('covers all visibility values', () => {
    for (const v of VISIBILITY_VALUES) {
      expect(() => makeRepo({ visibility: v })).not.toThrow();
    }
  });
});

describe('BranchSummary shape', () => {
  it('has all required fields with correct types', () => {
    const b = makeBranch();
    expect(typeof b.name).toBe('string');
    expect(typeof b.isProtected).toBe('boolean');
    expect(typeof b.isStale).toBe('boolean');
    expect(typeof b.aheadBy).toBe('number');
    expect(typeof b.behindBy).toBe('number');
  });

  it('covers all branch kind values', () => {
    for (const k of BRANCH_KIND_VALUES) {
      expect(() => makeBranch({ kind: k })).not.toThrow();
    }
  });
});

describe('PullRequestSummary shape', () => {
  it('has all required fields with correct types', () => {
    const pr = makePR();
    expect(typeof pr.id).toBe('string');
    expect(typeof pr.number).toBe('number');
    expect(typeof pr.title).toBe('string');
    expect(typeof pr.hasConflicts).toBe('boolean');
    expect(typeof pr.waitingForReview).toBe('boolean');
    expect(typeof pr.updatedAt).toBe('string');
    expect(() => new Date(pr.updatedAt).toISOString()).not.toThrow();
  });

  it('covers all PR view state values', () => {
    for (const s of PR_VIEW_STATES) {
      expect(() => makePR({ state: s })).not.toThrow();
    }
  });
});

describe('paginated envelope shapes', () => {
  it('RepositoryListResponse wraps array with meta', () => {
    const resp: RepositoryListResponse = {
      data: [makeRepo()],
      meta: { requestId: 'r1', timestamp: new Date().toISOString(), page: 1, pageSize: 20, total: 1 },
    };
    expect(resp.data.length).toBe(1);
    expect(resp.meta.total).toBe(1);
  });

  it('BranchListResponse wraps array with meta', () => {
    const resp: BranchListResponse = {
      data: [makeBranch()],
      meta: { requestId: 'r1', timestamp: new Date().toISOString(), total: 1 },
    };
    expect(resp.data.length).toBe(1);
  });

  it('PullRequestListResponse wraps array with meta', () => {
    const resp: PullRequestListResponse = {
      data: [makePR()],
      meta: { requestId: 'r1', timestamp: new Date().toISOString(), total: 1 },
    };
    expect(resp.data.length).toBe(1);
  });
});

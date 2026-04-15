import { describe, it, expect } from 'vitest';
import type {
  AsyncPendingResponse,
  RepositorySummary,
  BranchSummary,
  PullRequestDetailResponse,
  PullRequestRiskAnalysisResponse,
  PullRequestSummary,
  RepositoryListResponse,
  BranchListResponse,
  PullRequestListResponse,
  ReviewRecommendationsResponse,
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

describe('PR detail and analysis envelope shapes', () => {
  it('PullRequestDetailResponse exposes workflow, review, and quality gate state', () => {
    const resp: PullRequestDetailResponse = {
      data: {
        pullRequest: makePR(),
        workflowState: 'merge-blocked',
        githubUrl: 'https://github.example.com/acme/my-repo/pull/1',
        interpretedSummary: '필수 체크 실패로 병합이 차단되었습니다.',
        changedFiles: 12,
        commits: 3,
        labels: ['hotfix'],
        linkedBuilds: [
          {
            id: 'build-1',
            provider: 'github_actions',
            status: 'failed',
            targetName: 'ci',
            url: 'https://ci.example.com/build/1',
          },
        ],
        relatedIssues: ['INC-1'],
        reviewStatus: {
          reviewerCount: 2,
          requiredReviewerCount: 2,
          approvals: 1,
          changesRequested: 1,
          codeOwnersSatisfied: false,
          checklistCompleted: true,
          missingReviewers: ['codeowners'],
          pendingReviewers: [],
        },
        qualityGateStatus: {
          requiredChecksPassed: false,
          requiredCheckCount: 2,
          requiredCheckPassingCount: 1,
          failingChecks: ['ci'],
          mergeBlockedReasons: ['필수 체크 실패'],
          staticAnalysisStatus: 'failed',
          commitMessagePolicyPassed: true,
          releaseImpact: false,
          mergeQueueRequired: false,
        },
      },
      meta: { requestId: 'r1', timestamp: new Date().toISOString() },
    };
    expect(resp.data.workflowState).toBe('merge-blocked');
    expect(resp.data.reviewStatus.codeOwnersSatisfied).toBe(false);
    expect(resp.data.qualityGateStatus.failingChecks).toContain('ci');
  });

  it('PullRequestRiskAnalysisResponse exposes typed signals', () => {
    const resp: PullRequestRiskAnalysisResponse = {
      data: {
        riskLevel: 'high',
        score: 88,
        summary: 'hotspot 파일이 포함되었습니다.',
        signals: [
          {
            type: 'hotspot',
            severity: 'high',
            summary: '최근 충돌 hotspot 포함',
            scoreContribution: 20,
          },
        ],
        recommendedTests: ['smoke'],
        impactedModules: ['boot'],
      },
      meta: { requestId: 'r1', timestamp: new Date().toISOString() },
    };
    expect(resp.data.signals[0]?.severity).toBe('high');
  });

  it('ReviewRecommendationsResponse exposes codeowner and reviewer sets', () => {
    const resp: ReviewRecommendationsResponse = {
      data: {
        requiredCodeOwners: ['platform-boot'],
        missingCodeOwners: [],
        recommendedReviewers: [
          {
            id: 'u1',
            login: 'alice',
            displayName: 'Alice',
            email: null,
          },
        ],
        rationale: ['최근 리뷰 이력 기반 추천'],
      },
      meta: { requestId: 'r1', timestamp: new Date().toISOString() },
    };
    expect(resp.data.recommendedReviewers[0]?.login).toBe('alice');
  });

  it('AsyncPendingResponse models queued or running analysis', () => {
    const resp: AsyncPendingResponse = {
      data: {
        status: 'running',
        jobId: 'job-1',
      },
      meta: { requestId: 'r1', timestamp: new Date().toISOString() },
    };
    expect(resp.data.status).toBe('running');
  });
});

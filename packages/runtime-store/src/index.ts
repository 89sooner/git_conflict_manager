import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import type {
  AsyncPendingResult,
  BranchDetail,
  BranchSummary,
  PullRequestDetail,
  PullRequestRiskAnalysis,
  PullRequestSummary,
  RepositorySummary,
  ReviewRecommendations,
} from '@gsp/shared-types';

export interface RuntimeRiskRecord {
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'stale';
  jobId: string | null;
  updatedAt: string;
  analyzedAt: string | null;
  result: PullRequestRiskAnalysis | null;
  error: { message: string; retryable: boolean } | null;
}

export interface RuntimeReviewRecommendationRecord {
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'stale';
  jobId: string | null;
  updatedAt: string;
  computedAt: string | null;
  result: ReviewRecommendations | null;
  error: { message: string; retryable: boolean } | null;
}

export interface RuntimeSyncJobRequest {
  jobType: 'repo_sync' | 'pr_sync' | 'branch_sync' | 'check_sync' | 'backfill';
  triggerType: 'webhook' | 'scheduler' | 'manual' | 'retry';
  orgGithubId?: number | null;
  repoGithubId?: number | null;
  parameters?: Record<string, unknown>;
  correlationId: string;
}

export interface RuntimeSyncJobRecord extends RuntimeSyncJobRequest {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  errorMessage: string | null;
}

export interface RuntimeStoreSnapshot {
  repositories: RepositorySummary[];
  repositoryGithubIds: Record<string, number>;
  branches: Record<string, BranchSummary[]>;
  branchDetails: Record<string, BranchDetail>;
  pullRequests: PullRequestSummary[];
  pullRequestDetails: Record<string, PullRequestDetail>;
  pullRequestRepositoryIds: Record<string, string>;
  pullRequestRisks: Record<string, RuntimeRiskRecord>;
  reviewRecommendations: Record<string, RuntimeReviewRecommendationRecord>;
  syncJobs: RuntimeSyncJobRecord[];
}

const DEFAULT_STORE_FILE = join(tmpdir(), 'gsp-runtime-store.json');
const NOW = '2026-04-15T09:00:00.000Z';
let idCounter = 0;

function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter.toString().padStart(4, '0')}`;
}

export function getRuntimeStoreFile(): string {
  return process.env.GSP_RUNTIME_STORE_FILE ?? DEFAULT_STORE_FILE;
}

function ensureParentDir(file: string): void {
  mkdirSync(dirname(file), { recursive: true });
}

function writeSnapshot(file: string, snapshot: RuntimeStoreSnapshot): void {
  ensureParentDir(file);
  writeFileSync(file, `${JSON.stringify(snapshot, null, 2)}
`, 'utf8');
}

export function createSeedRuntimeStoreSnapshot(): RuntimeStoreSnapshot {
  const repositories: RepositorySummary[] = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      githubNodeId: 'R_repo_boot',
      name: 'boot-control',
      fullName: 'platform/boot-control',
      defaultBranch: 'main',
      visibility: 'private',
      teamName: 'Platform Boot',
      riskLevel: 'high',
      openPullRequestCount: 2,
      staleBranchCount: 1,
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      githubNodeId: 'R_repo_telemetry',
      name: 'soc-telemetry',
      fullName: 'platform/soc-telemetry',
      defaultBranch: 'main',
      visibility: 'internal',
      teamName: 'Telemetry',
      riskLevel: 'medium',
      openPullRequestCount: 1,
      staleBranchCount: 0,
    },
  ];

  const branches: Record<string, BranchSummary[]> = {
    '11111111-1111-4111-8111-111111111111': [
      {
        name: 'main',
        kind: 'default',
        isProtected: true,
        isStale: false,
        aheadBy: 0,
        behindBy: 0,
        latestCommitSha: '9f7aa1b',
      },
      {
        name: 'release/2026.04',
        kind: 'release',
        isProtected: true,
        isStale: false,
        aheadBy: 0,
        behindBy: 2,
        latestCommitSha: '8c2bb0f',
      },
      {
        name: 'feature/boot-order-cleanup',
        kind: 'feature',
        isProtected: false,
        isStale: true,
        aheadBy: 3,
        behindBy: 7,
        latestCommitSha: '1d0ca7e',
      },
    ],
    '22222222-2222-4222-8222-222222222222': [
      {
        name: 'main',
        kind: 'default',
        isProtected: true,
        isStale: false,
        aheadBy: 0,
        behindBy: 0,
        latestCommitSha: '14d3f60',
      },
      {
        name: 'feature/reduce-uart-noise',
        kind: 'feature',
        isProtected: false,
        isStale: false,
        aheadBy: 5,
        behindBy: 1,
        latestCommitSha: 'bc837cd',
      },
    ],
  };

  const pullRequests: PullRequestSummary[] = [
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      number: 128,
      title: 'feat: split boot target validation from board bring-up',
      state: 'open',
      author: {
        id: '00000000-0000-4000-8000-000000000101',
        login: 'eunji',
        displayName: 'Eunji Kim',
        email: 'eunji@example.com',
      },
      baseBranch: 'main',
      headBranch: 'feature/boot-order-cleanup',
      riskLevel: 'medium',
      hasConflicts: false,
      waitingForReview: false,
      updatedAt: '2026-04-15T07:20:00Z',
    },
    {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
      number: 129,
      title: 'fix: stabilize release branch image signing fallback',
      state: 'open',
      author: {
        id: '00000000-0000-4000-8000-000000000102',
        login: 'minho',
        displayName: 'Minho Lee',
        email: 'minho@example.com',
      },
      baseBranch: 'release/2026.04',
      headBranch: 'hotfix/signing-fallback',
      riskLevel: 'high',
      hasConflicts: false,
      waitingForReview: true,
      updatedAt: '2026-04-15T08:10:00Z',
    },
    {
      id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
      number: 57,
      title: 'refactor: reduce UART telemetry ISR noise',
      state: 'open',
      author: {
        id: '00000000-0000-4000-8000-000000000103',
        login: 'sohee',
        displayName: 'Sohee Park',
        email: 'sohee@example.com',
      },
      baseBranch: 'main',
      headBranch: 'feature/reduce-uart-noise',
      riskLevel: 'critical',
      hasConflicts: true,
      waitingForReview: false,
      updatedAt: '2026-04-15T06:40:00Z',
    },
  ];

  const pullRequestDetails: Record<string, PullRequestDetail> = {
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1': {
      pullRequest: pullRequests[0]!,
      workflowState: 'ready-to-merge',
      githubUrl: 'https://github.example.com/platform/boot-control/pull/128',
      interpretedSummary:
        '필수 승인과 체크가 완료되어 병합 준비가 끝났습니다. merge queue를 사용하지 않는 브랜치이므로 즉시 병합 가능합니다.',
      changedFiles: 18,
      commits: 5,
      labels: ['boot', 'refactor'],
      linkedBuilds: [
        {
          id: '10000000-0000-4000-8000-000000000001',
          provider: 'github_actions',
          status: 'success',
          targetName: 'boot-control-ci',
          url: 'https://ci.example.com/build/1001',
        },
        {
          id: '10000000-0000-4000-8000-000000000002',
          provider: 'jenkins',
          status: 'success',
          targetName: 'board-regression',
          url: 'https://ci.example.com/build/1002',
        },
      ],
      relatedIssues: ['INC-2041', 'PLAT-882'],
      reviewStatus: {
        reviewerCount: 3,
        requiredReviewerCount: 2,
        approvals: 2,
        changesRequested: 0,
        codeOwnersSatisfied: true,
        checklistCompleted: true,
        missingReviewers: [],
        pendingReviewers: [],
      },
      qualityGateStatus: {
        requiredChecksPassed: true,
        requiredCheckCount: 2,
        requiredCheckPassingCount: 2,
        failingChecks: [],
        mergeBlockedReasons: [],
        staticAnalysisStatus: 'passed',
        commitMessagePolicyPassed: true,
        releaseImpact: false,
        mergeQueueRequired: false,
      },
    },
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2': {
      pullRequest: pullRequests[1]!,
      workflowState: 'under-review',
      githubUrl: 'https://github.example.com/platform/boot-control/pull/129',
      interpretedSummary:
        '릴리스 브랜치 대상 변경입니다. 리뷰는 진행 중이지만 위험도 분석이 아직 최신 커밋 기준으로 완료되지 않았습니다.',
      changedFiles: 9,
      commits: 2,
      labels: ['release', 'hotfix'],
      linkedBuilds: [
        {
          id: '10000000-0000-4000-8000-000000000003',
          provider: 'buildkite',
          status: 'running',
          targetName: 'release-signing-validation',
          url: 'https://ci.example.com/build/1003',
        },
      ],
      relatedIssues: ['REL-301'],
      reviewStatus: {
        reviewerCount: 1,
        requiredReviewerCount: 2,
        approvals: 0,
        changesRequested: 0,
        codeOwnersSatisfied: false,
        checklistCompleted: false,
        missingReviewers: ['release-managers', 'codeowners'],
        pendingReviewers: ['release-managers'],
      },
      qualityGateStatus: {
        requiredChecksPassed: false,
        requiredCheckCount: 2,
        requiredCheckPassingCount: 0,
        failingChecks: [],
        mergeBlockedReasons: ['위험도 분석이 최신 커밋 기준으로 아직 완료되지 않았습니다.'],
        staticAnalysisStatus: 'pending',
        commitMessagePolicyPassed: true,
        releaseImpact: true,
        mergeQueueRequired: true,
      },
    },
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc3': {
      pullRequest: pullRequests[2]!,
      workflowState: 'merge-blocked',
      githubUrl: 'https://github.example.com/platform/soc-telemetry/pull/57',
      interpretedSummary:
        '충돌과 필수 체크 실패가 동시에 감지되어 병합이 차단되었습니다. 영향 범위가 넓어 수동 검토가 필요합니다.',
      changedFiles: 42,
      commits: 7,
      labels: ['driver', 'telemetry'],
      linkedBuilds: [
        {
          id: '10000000-0000-4000-8000-000000000004',
          provider: 'github_actions',
          status: 'failed',
          targetName: 'soc-telemetry-ci',
          url: 'https://ci.example.com/build/1004',
        },
      ],
      relatedIssues: ['DRV-144', 'QA-918'],
      reviewStatus: {
        reviewerCount: 2,
        requiredReviewerCount: 2,
        approvals: 1,
        changesRequested: 1,
        codeOwnersSatisfied: false,
        checklistCompleted: true,
        missingReviewers: ['telemetry-owners'],
        pendingReviewers: [],
      },
      qualityGateStatus: {
        requiredChecksPassed: false,
        requiredCheckCount: 3,
        requiredCheckPassingCount: 1,
        failingChecks: ['soc-telemetry-ci', 'irq-safety-scan'],
        mergeBlockedReasons: ['병합 충돌이 존재합니다.', '필수 체크가 실패했습니다.', 'CODEOWNERS 승인이 누락되었습니다.'],
        staticAnalysisStatus: 'failed',
        commitMessagePolicyPassed: true,
        releaseImpact: false,
        mergeQueueRequired: false,
      },
    },
  };

  return {
    repositories,
    repositoryGithubIds: {
      '11111111-1111-4111-8111-111111111111': 1111,
      '22222222-2222-4222-8222-222222222222': 2222,
    },
    branches,
    branchDetails: {
      '11111111-1111-4111-8111-111111111111::main': {
        branch: branches['11111111-1111-4111-8111-111111111111']![0]!,
        interpretedStatus: '기본 브랜치이며 보호 규칙이 적용되어 있습니다.',
        recommendedActions: ['최근 병합 상태 확인', '위험 PR 목록 검토'],
        linkedPullRequest: null,
      },
      '11111111-1111-4111-8111-111111111111::feature/boot-order-cleanup': {
        branch: branches['11111111-1111-4111-8111-111111111111']![2]!,
        interpretedStatus: 'main 대비 3 commits ahead, 7 commits behind 상태입니다. 업데이트가 필요합니다.',
        recommendedActions: ['base branch 최신화', 'PR #128 검토 후 병합'],
        linkedPullRequest: pullRequests[0]!,
      },
      '22222222-2222-4222-8222-222222222222::feature/reduce-uart-noise': {
        branch: branches['22222222-2222-4222-8222-222222222222']![1]!,
        interpretedStatus: 'main 대비 ahead 상태이며 충돌 가능성이 높습니다.',
        recommendedActions: ['충돌 파일 확인', 'PR #57 차단 사유 해결'],
        linkedPullRequest: pullRequests[2]!,
      },
    },
    pullRequests,
    pullRequestDetails,
    pullRequestRepositoryIds: {
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1': '11111111-1111-4111-8111-111111111111',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2': '11111111-1111-4111-8111-111111111111',
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc3': '22222222-2222-4222-8222-222222222222',
    },
    pullRequestRisks: {
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1': {
        status: 'succeeded',
        jobId: 'job-risk-ready-128',
        updatedAt: NOW,
        analyzedAt: NOW,
        result: {
          riskLevel: 'medium',
          score: 62,
          summary: '부트 경로와 보드 초기화 로직을 함께 조정했지만 테스트가 동반되어 위험도는 관리 가능한 수준입니다.',
          signals: [
            {
              type: 'multi-subsystem-change',
              severity: 'medium',
              summary: 'boot 및 board bring-up 영역을 함께 수정했습니다.',
              scoreContribution: 18,
            },
            {
              type: 'tests-present',
              severity: 'low',
              summary: '회귀 테스트가 함께 추가되었습니다.',
              scoreContribution: -8,
            },
          ],
          recommendedTests: ['boot-control-ci', 'board-regression'],
          impactedModules: ['boot', 'board-init'],
        },
        error: null,
      },
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2': {
        status: 'running',
        jobId: 'job-risk-running-129',
        updatedAt: NOW,
        analyzedAt: null,
        result: null,
        error: null,
      },
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc3': {
        status: 'failed',
        jobId: 'job-risk-failed-57',
        updatedAt: NOW,
        analyzedAt: null,
        result: null,
        error: {
          message: '최신 diff 기준 영향 분석 중 check metadata가 불완전해 partial result 생성에 실패했습니다.',
          retryable: true,
        },
      },
    },
    reviewRecommendations: {
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1': {
        status: 'succeeded',
        jobId: 'job-review-128',
        updatedAt: NOW,
        computedAt: NOW,
        result: {
          requiredCodeOwners: ['platform-boot'],
          missingCodeOwners: [],
          recommendedReviewers: [
            {
              id: '00000000-0000-4000-8000-000000000201',
              login: 'jiwon',
              displayName: 'Jiwon Choi',
              email: 'jiwon@example.com',
            },
            {
              id: '00000000-0000-4000-8000-000000000202',
              login: 'taesoo',
              displayName: 'Taesoo Han',
              email: 'taesoo@example.com',
            },
          ],
          rationale: [
            'platform-boot 팀이 CODEOWNERS 대상입니다.',
            '최근 30일간 boot-order 관련 변경을 가장 많이 리뷰한 사용자입니다.',
          ],
        },
        error: null,
      },
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2': {
        status: 'succeeded',
        jobId: 'job-review-129',
        updatedAt: NOW,
        computedAt: NOW,
        result: {
          requiredCodeOwners: ['release-managers', 'security-signing'],
          missingCodeOwners: ['release-managers'],
          recommendedReviewers: [
            {
              id: '00000000-0000-4000-8000-000000000203',
              login: 'yuna',
              displayName: 'Yuna Seo',
              email: 'yuna@example.com',
            },
          ],
          rationale: [
            'release branch 대상 변경이라 release-managers 승인이 필수입니다.',
            '서명 fallback 경로를 최근 수정한 리뷰어를 우선 추천했습니다.',
          ],
        },
        error: null,
      },
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc3': {
        status: 'succeeded',
        jobId: 'job-review-57',
        updatedAt: NOW,
        computedAt: NOW,
        result: {
          requiredCodeOwners: ['telemetry-owners', 'irq-safety'],
          missingCodeOwners: ['telemetry-owners'],
          recommendedReviewers: [
            {
              id: '00000000-0000-4000-8000-000000000204',
              login: 'dongwook',
              displayName: 'Dongwook Lim',
              email: 'dongwook@example.com',
            },
            {
              id: '00000000-0000-4000-8000-000000000205',
              login: 'nari',
              displayName: 'Nari Jung',
              email: 'nari@example.com',
            },
          ],
          rationale: [
            'IRQ 안전성 관련 경로와 telemetry driver가 동시에 변경되었습니다.',
            '과거 hotspot 파일 리뷰 이력이 있는 사용자를 포함했습니다.',
          ],
        },
        error: null,
      },
    },
    syncJobs: [],
  };
}

export function resetRuntimeStore(snapshot?: RuntimeStoreSnapshot): RuntimeStoreSnapshot {
  const file = getRuntimeStoreFile();
  const next = snapshot ? structuredClone(snapshot) : createSeedRuntimeStoreSnapshot();
  writeSnapshot(file, next);
  return next;
}

export function readRuntimeStore(): RuntimeStoreSnapshot {
  const file = getRuntimeStoreFile();
  if (!existsSync(file)) {
    return resetRuntimeStore();
  }
  return JSON.parse(readFileSync(file, 'utf8')) as RuntimeStoreSnapshot;
}

export function updateRuntimeStore(mutator: (snapshot: RuntimeStoreSnapshot) => void): RuntimeStoreSnapshot {
  const file = getRuntimeStoreFile();
  const snapshot = readRuntimeStore();
  mutator(snapshot);
  writeSnapshot(file, snapshot);
  return snapshot;
}

export function enqueueSyncJob(request: RuntimeSyncJobRequest): RuntimeSyncJobRecord {
  const now = new Date().toISOString();
  let queued!: RuntimeSyncJobRecord;
  updateRuntimeStore((snapshot) => {
    queued = {
      id: newId('sync'),
      status: 'queued',
      createdAt: now,
      updatedAt: now,
      errorMessage: null,
      ...request,
    };
    snapshot.syncJobs.push(queued);
  });
  return queued;
}

export function listQueuedSyncJobs(): RuntimeSyncJobRecord[] {
  return readRuntimeStore().syncJobs.filter((job) => job.status === 'queued');
}

export function updateSyncJob(jobId: string, updater: (job: RuntimeSyncJobRecord) => void): RuntimeStoreSnapshot {
  return updateRuntimeStore((snapshot) => {
    const job = snapshot.syncJobs.find((candidate) => candidate.id === jobId);
    if (!job) {
      throw new Error(`sync job ${jobId} not found`);
    }
    updater(job);
    job.updatedAt = new Date().toISOString();
  });
}

export function findRepositoryIdByGithubRepoId(repoGithubId: number | null | undefined): string | null {
  if (typeof repoGithubId !== 'number') return null;
  const snapshot = readRuntimeStore();
  for (const [repositoryId, githubId] of Object.entries(snapshot.repositoryGithubIds)) {
    if (githubId === repoGithubId) return repositoryId;
  }
  return null;
}

export function findPullRequestIdsForRepo(repositoryId: string, prNumber?: number | null): string[] {
  const snapshot = readRuntimeStore();
  return snapshot.pullRequests
    .filter((pr) => snapshot.pullRequestRepositoryIds[pr.id] === repositoryId)
    .filter((pr) => (typeof prNumber === 'number' ? pr.number === prNumber : true))
    .map((pr) => pr.id);
}

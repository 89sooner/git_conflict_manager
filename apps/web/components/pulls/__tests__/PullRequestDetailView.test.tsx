// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PullRequestDetailView } from '../PullRequestDetailView';
import { ApiClientError } from '../../../lib/api/errors';
import type { PullRequestDetailResponse } from '@gsp/shared-types';

function makeDetail(overrides: Partial<PullRequestDetailResponse['data']> = {}): PullRequestDetailResponse['data'] {
  return {
    pullRequest: {
      id: 'pr-1',
      number: 128,
      title: 'feat: tighten PR experience',
      state: 'open',
      author: {
        id: 'user-1',
        login: 'bootstrap',
        displayName: 'Bootstrap User',
        email: null,
      },
      baseBranch: 'main',
      headBranch: 'feature/pr-ui',
      riskLevel: 'high',
      hasConflicts: false,
      waitingForReview: true,
      updatedAt: '2026-04-15T00:00:00.000Z',
    },
    workflowState: 'open',
    githubUrl: 'https://github.com/example/repo/pull/128',
    interpretedSummary: '리뷰 준비 상태를 확인할 수 있습니다.',
    changedFiles: 8,
    commits: 4,
    labels: ['ui', 'phase-6'],
    linkedBuilds: [
      {
        id: 'build-1',
        provider: 'github-actions',
        targetName: 'unit-tests',
        status: 'success',
        url: 'https://example.com/build-1',
      },
      {
        id: 'build-2',
        provider: 'github-actions',
        targetName: 'lint',
        status: 'success',
        url: 'https://example.com/build-2',
      },
    ],
    relatedIssues: ['OPS-12'],
    reviewStatus: {
      reviewerCount: 2,
      requiredReviewerCount: 1,
      approvals: 1,
      changesRequested: 0,
      codeOwnersSatisfied: true,
      checklistCompleted: true,
      missingReviewers: [],
      pendingReviewers: [],
    },
    qualityGateStatus: {
      requiredChecksPassed: true,
      requiredCheckCount: 3,
      requiredCheckPassingCount: 3,
      failingChecks: [],
      mergeBlockedReasons: [],
      staticAnalysisStatus: 'passed',
      commitMessagePolicyPassed: true,
      releaseImpact: false,
      mergeQueueRequired: false,
    },
    ...overrides,
  };
}

describe('PullRequestDetailView', () => {
  it('renders ready detail state with analysis and review recommendations', () => {
    render(
      <PullRequestDetailView
        detail={makeDetail()}
        riskAnalysis={{
          kind: 'ready',
          data: {
            riskLevel: 'high',
            score: 84,
            summary: '변경 범위가 넓지만 테스트 커버가 양호합니다.',
            signals: [
              { type: 'diff-size', severity: 'medium', summary: 'diff size > 300 lines', scoreContribution: 8 },
              { type: 'checkout-flow', severity: 'high', summary: 'touches checkout flow', scoreContribution: 12 },
            ],
            recommendedTests: ['npm test', 'integration checkout flow'],
            impactedModules: ['apps/web', 'packages/shared-types'],
          },
        }}
        reviewRecommendations={{
          kind: 'ready',
          data: {
            requiredCodeOwners: ['frontend-platform'],
            missingCodeOwners: [],
            recommendedReviewers: [
              { id: 'user-2', login: 'alice', displayName: 'Alice Kim', email: null },
              { id: 'user-3', login: 'bob', displayName: 'Bob Park', email: null },
            ],
            rationale: ['UI와 상태 전이가 넓어 프론트엔드 검토가 우선입니다.'],
          },
        }}
      />,
    );

    expect(screen.getByText('#128 feat: tighten PR experience')).toBeInTheDocument();
    expect(screen.getByText('Risk score 84')).toBeInTheDocument();
    expect(screen.getByText('frontend-platform')).toBeInTheDocument();
    expect(screen.getAllByText('Checks Passing').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: 'PR 병합' })).toBeDisabled();
  });

  it('renders pending detail state when risk analysis is queued or running', () => {
    render(
      <PullRequestDetailView
        detail={makeDetail()}
        riskAnalysis={{
          kind: 'pending',
          data: {
            status: 'running',
            jobId: 'job-risk-1',
          },
        }}
        reviewRecommendations={{
          kind: 'ready',
          data: {
            requiredCodeOwners: ['frontend-platform'],
            missingCodeOwners: [],
            recommendedReviewers: [
              { id: 'user-2', login: 'alice', displayName: 'Alice Kim', email: null },
            ],
            rationale: ['PR 검토가 가능합니다.'],
          },
        }}
      />,
    );

    expect(screen.getByText('분석 중')).toBeInTheDocument();
    expect(screen.getByText(/job-risk-1/)).toBeInTheDocument();
    expect(screen.getByText('분석이 이미 진행 중입니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '위험도 재분석' })).toBeDisabled();
  });

  it('renders failed detail state when risk analysis fails', () => {
    render(
      <PullRequestDetailView
        detail={makeDetail()}
        riskAnalysis={{
          kind: 'failed',
          error: new ApiClientError(
            {
              code: 'PR_ANALYSIS_FAILED',
              message: '분석을 완료하지 못했습니다.',
              retryable: true,
            },
            503,
          ),
        }}
        reviewRecommendations={{
          kind: 'ready',
          data: {
            requiredCodeOwners: ['frontend-platform'],
            missingCodeOwners: ['frontend-platform'],
            recommendedReviewers: [
              { id: 'user-2', login: 'alice', displayName: 'Alice Kim', email: null },
            ],
            rationale: ['CODEOWNERS 누락을 우선 보완하세요.'],
          },
        }}
      />,
    );

    expect(screen.getByText('위험도 분석을 불러오지 못했습니다')).toBeInTheDocument();
    expect(screen.getByText('분석을 완료하지 못했습니다.')).toBeInTheDocument();
    expect(screen.getByText(/PR_ANALYSIS_FAILED/)).toBeInTheDocument();
    expect(screen.getAllByText('Review Needs Attention').length).toBeGreaterThanOrEqual(1);
  });
});

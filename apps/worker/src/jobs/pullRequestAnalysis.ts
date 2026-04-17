import type { RiskLevel, PullRequestRiskAnalysis, ReviewRecommendations } from '@gsp/shared-types';
import { readRuntimeStore, updateRuntimeStore, listQueuedSyncJobs, updateSyncJob, findPullRequestIdsForRepo, findRepositoryIdByGithubRepoId } from '@gsp/runtime-store';

export interface ProcessSyncJobsResult {
  processedJobs: number;
  updatedPullRequests: number;
}

function buildRiskAnalysis(pullRequestId: string): PullRequestRiskAnalysis {
  const snapshot = readRuntimeStore();
  const detail = snapshot.pullRequestDetails[pullRequestId];
  const releaseImpact = detail.qualityGateStatus.releaseImpact ? 20 : 0;
  const conflictPenalty = detail.pullRequest.hasConflicts ? 18 : 0;
  const failingChecksPenalty = detail.qualityGateStatus.failingChecks.length * 7;
  const missingReviewerPenalty = detail.reviewStatus.missingReviewers.length * 6;
  const score = Math.min(100, detail.changedFiles + detail.commits * 4 + releaseImpact + conflictPenalty + failingChecksPenalty + missingReviewerPenalty);
  const riskLevel = score >= 85 ? 'critical' : score >= 65 ? 'high' : score >= 40 ? 'medium' : 'low';

  const signals: Array<{ type: string; severity: RiskLevel; summary: string; scoreContribution: number }> = [
    {
      type: 'changed-files',
      severity: detail.changedFiles > 20 ? 'high' : detail.changedFiles > 10 ? 'medium' : 'low',
      summary: `변경 파일 ${detail.changedFiles}개`,
      scoreContribution: detail.changedFiles,
    },
    {
      type: 'build-status',
      severity: detail.qualityGateStatus.failingChecks.length > 0 ? 'high' : detail.linkedBuilds.some((build) => build.status === 'running') ? 'medium' : 'low',
      summary: detail.qualityGateStatus.failingChecks.length > 0 ? `실패한 체크 ${detail.qualityGateStatus.failingChecks.length}개` : '필수 체크 안정적',
      scoreContribution: failingChecksPenalty,
    },
  ];

  if (detail.qualityGateStatus.releaseImpact) {
    signals.push({
      type: 'release-impact',
      severity: 'high',
      summary: '릴리스 브랜치 영향이 있습니다.',
      scoreContribution: releaseImpact,
    });
  }

  if (detail.pullRequest.hasConflicts) {
    signals.push({
      type: 'merge-conflict',
      severity: 'high',
      summary: '병합 충돌이 감지되었습니다.',
      scoreContribution: conflictPenalty,
    });
  }

  return {
    riskLevel,
    score,
    summary: `${detail.labels.join(', ') || 'general'} 영역 변경입니다. ${detail.qualityGateStatus.mergeBlockedReasons[0] ?? '현재 기준 위험도 재계산이 완료되었습니다.'}`,
    signals,
    recommendedTests: detail.linkedBuilds.map((build) => build.targetName),
    impactedModules: detail.labels.length > 0 ? detail.labels : ['general'],
  };
}

function buildReviewRecommendations(pullRequestId: string): ReviewRecommendations {
  const snapshot = readRuntimeStore();
  const detail = snapshot.pullRequestDetails[pullRequestId];
  const baseReviewers = detail.reviewStatus.missingReviewers.length > 0 ? detail.reviewStatus.missingReviewers : detail.labels.map((label) => `${label}-owners`);
  const requiredCodeOwners = Array.from(new Set(baseReviewers.filter((item) => item !== 'codeowners')));
  const missingCodeOwners = detail.reviewStatus.codeOwnersSatisfied ? [] : requiredCodeOwners.slice(0, 1);
  const recommendedReviewers = detail.pullRequest.hasConflicts
    ? [
        { id: 'worker-user-1', login: 'resolver', displayName: 'Conflict Resolver', email: null },
        { id: 'worker-user-2', login: 'owner', displayName: 'Module Owner', email: null },
      ]
    : [
        { id: 'worker-user-3', login: 'reviewer-a', displayName: 'Reviewer A', email: null },
        { id: 'worker-user-4', login: 'reviewer-b', displayName: 'Reviewer B', email: null },
      ];

  return {
    requiredCodeOwners,
    missingCodeOwners,
    recommendedReviewers,
    rationale: [
      `PR #${detail.pullRequest.number}의 현재 리뷰 상태를 기준으로 계산했습니다.`,
      detail.pullRequest.hasConflicts ? '충돌과 품질 게이트를 함께 볼 수 있는 리뷰어를 우선 추천했습니다.' : '최근 라벨/모듈 컨텍스트를 기준으로 권장 리뷰어를 선택했습니다.',
    ],
  };
}

export function processPendingSyncJobs(logger?: { info?: (...args: unknown[]) => void; error?: (...args: unknown[]) => void }): ProcessSyncJobsResult {
  const queued = listQueuedSyncJobs();
  let processedJobs = 0;
  let updatedPullRequests = 0;

  for (const job of queued) {
    processedJobs += 1;
    updateSyncJob(job.id, (candidate) => {
      candidate.status = 'running';
    });

    try {
      const repositoryId = findRepositoryIdByGithubRepoId(job.repoGithubId);
      const prNumber = typeof job.parameters?.prNumber === 'number' ? job.parameters.prNumber : null;
      const pullRequestIds = repositoryId ? findPullRequestIdsForRepo(repositoryId, prNumber) : [];

      if (job.jobType === 'pr_sync' || job.jobType === 'check_sync') {
        updateRuntimeStore((snapshot) => {
          for (const pullRequestId of pullRequestIds) {
            const risk = buildRiskAnalysis(pullRequestId);
            const review = buildReviewRecommendations(pullRequestId);
            snapshot.pullRequestRisks[pullRequestId] = {
              status: 'succeeded',
              jobId: job.id,
              updatedAt: new Date().toISOString(),
              analyzedAt: new Date().toISOString(),
              result: risk,
              error: null,
            };
            snapshot.reviewRecommendations[pullRequestId] = {
              status: 'succeeded',
              jobId: job.id,
              updatedAt: new Date().toISOString(),
              computedAt: new Date().toISOString(),
              result: review,
              error: null,
            };
            const pullRequest = snapshot.pullRequests.find((candidate) => candidate.id === pullRequestId);
            if (pullRequest) {
              pullRequest.riskLevel = risk.riskLevel;
            }
            const detail = snapshot.pullRequestDetails[pullRequestId];
            if (detail) {
              detail.pullRequest.riskLevel = risk.riskLevel;
              if (!detail.qualityGateStatus.mergeBlockedReasons.length) {
                detail.interpretedSummary = `${detail.interpretedSummary.split(' 최신 ')[0]} 최신 분석과 리뷰 추천이 반영되었습니다.`;
              }
            }
            updatedPullRequests += 1;
          }
        });
      }

      updateSyncJob(job.id, (candidate) => {
        candidate.status = 'succeeded';
      });
      logger?.info?.({ jobId: job.id, jobType: job.jobType, updatedPullRequests }, 'sync job processed');
    } catch (error) {
      updateSyncJob(job.id, (candidate) => {
        candidate.status = 'failed';
        candidate.errorMessage = error instanceof Error ? error.message : 'unknown error';
      });
      logger?.error?.({ err: error, jobId: job.id }, 'failed to process sync job');
    }
  }

  return { processedJobs, updatedPullRequests };
}

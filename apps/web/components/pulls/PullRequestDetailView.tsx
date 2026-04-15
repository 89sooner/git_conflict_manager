import type { ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  GitPullRequest,
  Link2,
  MessagesSquare,
  ShieldAlert,
} from 'lucide-react';
import {
  pullRequestBadge,
  riskBadge,
  type BadgeDescriptor,
  type BuildSummary,
  type PullRequestDetailResponse,
  type PullRequestQualityGateStatus,
  type PullRequestReviewStatus,
} from '@gsp/shared-types';
import { StatusBadge } from '../StatusBadge';
import { MetricCard } from '../MetricCard';
import { EmptyState, ErrorState } from '../states';
import type {
  PullRequestRiskAnalysisPending,
  PullRequestRiskAnalysisReady,
  PullRequestReviewRecommendations,
} from '../../lib/api';

export type PullRequestRiskAnalysisState =
  | { kind: 'ready'; data: PullRequestRiskAnalysisReady }
  | { kind: 'pending'; data: PullRequestRiskAnalysisPending }
  | { kind: 'failed'; error: unknown };

export type PullRequestReviewRecommendationsState =
  | { kind: 'ready'; data: PullRequestReviewRecommendations }
  | { kind: 'failed'; error: unknown };

export interface PullRequestDetailViewProps {
  detail: PullRequestDetailResponse['data'];
  riskAnalysis: PullRequestRiskAnalysisState;
  reviewRecommendations: PullRequestReviewRecommendationsState;
}

export function PullRequestDetailView({
  detail,
  riskAnalysis,
  reviewRecommendations,
}: PullRequestDetailViewProps) {
  const { pullRequest } = detail;
  const reviewBadge = buildReviewBadge(detail.reviewStatus, reviewRecommendations);
  const gateBadge = buildQualityGateBadge(
    detail.qualityGateStatus,
    detail.linkedBuilds,
    pullRequest.hasConflicts,
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-vercel">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge descriptor={pullRequestBadge(detail.workflowState)} />
          <StatusBadge descriptor={riskBadge(pullRequest.riskLevel)} />
          <StatusBadge descriptor={reviewBadge} />
          <StatusBadge descriptor={gateBadge} />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            #{pullRequest.number} {pullRequest.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {pullRequest.author.displayName} (@{pullRequest.author.login}) · {pullRequest.baseBranch}{' '}
            ← {pullRequest.headBranch}
          </p>
          <p className="text-sm text-foreground">{buildSummaryLine(detail, reviewBadge, gateBadge, riskAnalysis)}</p>
        </div>

        {detail.labels.length ? (
          <div className="flex flex-wrap gap-2">
            {detail.labels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground"
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <GitPullRequest className="h-3.5 w-3.5" />
            변경 파일 {detail.changedFiles}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            커밋 {detail.commits}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MessagesSquare className="h-3.5 w-3.5" />
            관련 이슈 {detail.relatedIssues.length}
          </span>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="변경 파일" value={detail.changedFiles} icon={<FileText className="h-4 w-4" />} />
            <MetricCard title="커밋" value={detail.commits} icon={<GitPullRequest className="h-4 w-4" />} />
            <MetricCard
              title="링크된 빌드"
              value={detail.linkedBuilds.length}
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <MetricCard
              title="관련 이슈"
              value={detail.relatedIssues.length}
              icon={<MessagesSquare className="h-4 w-4" />}
            />
          </section>

          <SectionCard
            id="review-readiness"
            title="리뷰 준비 상태"
            description="CODEOWNERS, 리뷰 요청, 충돌 여부를 함께 보여줍니다."
            action={<StatusBadge descriptor={reviewBadge} />}
          >
            <ReviewReadiness detail={detail} reviewRecommendations={reviewRecommendations} />
          </SectionCard>

          <SectionCard
            id="quality-gates"
            title="품질 게이트"
            description="링크된 빌드와 차단 사유를 기준으로 현재 병합 가능성을 표시합니다."
            action={<StatusBadge descriptor={gateBadge} />}
          >
            <QualityGateSection
              qualityGateStatus={detail.qualityGateStatus}
              builds={detail.linkedBuilds}
              hasConflicts={pullRequest.hasConflicts}
            />
          </SectionCard>

          <SectionCard
            id="risk-analysis"
            title="위험도 분석"
            description="분석 결과와 권장 검증 항목을 보여줍니다."
            action={
              riskAnalysis.kind === 'ready' ? (
                <StatusBadge descriptor={riskBadge(riskAnalysis.data.riskLevel)} />
              ) : null
            }
          >
            <RiskAnalysisSection riskAnalysis={riskAnalysis} />
          </SectionCard>

          <SectionCard
            id="review-recommendations"
            title="리뷰 추천"
            description="필수 CODEOWNER와 권장 리뷰어를 보여줍니다."
          >
            <ReviewRecommendationsSection reviewRecommendations={reviewRecommendations} />
          </SectionCard>

          <SectionCard id="related-context" title="참조 정보" description="원본 PR 컨텍스트를 빠르게 확인합니다.">
            <div className="grid gap-4 md:grid-cols-2">
              <DetailList
                title="라벨"
                items={detail.labels}
                emptyLabel="라벨이 없습니다"
                icon={<TagIcon />}
              />
              <DetailList
                title="관련 이슈"
                items={detail.relatedIssues}
                emptyLabel="연결된 이슈가 없습니다"
                icon={<Link2 className="h-4 w-4" />}
              />
            </div>
          </SectionCard>
        </div>

        <ActionPanel
          detail={detail}
          reviewBadge={reviewBadge}
          gateBadge={gateBadge}
          riskAnalysis={riskAnalysis}
        />
      </div>
    </div>
  );
}

function SectionCard({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="rounded-2xl border border-border bg-card p-6 shadow-vercel">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function ReviewReadiness({
  detail,
  reviewRecommendations,
}: {
  detail: PullRequestDetailResponse['data'];
  reviewRecommendations: PullRequestReviewRecommendationsState;
}) {
  const blockers = buildReviewBlockers(detail.reviewStatus, reviewRecommendations);
  const ready = blockers.length === 0;
  const tone: BadgeDescriptor['tone'] = ready
    ? 'success'
    : detail.workflowState === 'draft'
      ? 'neutral'
      : 'warning';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          descriptor={{
            label: ready ? 'Review Ready' : detail.workflowState === 'draft' ? 'Draft' : 'Review Needs Attention',
            tone,
            description: ready ? '리뷰 준비 완료' : '리뷰 전 확인할 항목이 있습니다',
          }}
        />
        <span className="text-sm text-muted-foreground">
          {ready
            ? '리뷰어와 코드오너 정보가 충분합니다.'
            : '아래 차단 사유를 해결하면 리뷰 흐름이 더 명확해집니다.'}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        리뷰어 {detail.reviewStatus.reviewerCount}/{detail.reviewStatus.requiredReviewerCount} · 승인{' '}
        {detail.reviewStatus.approvals} · 수정 요청 {detail.reviewStatus.changesRequested}
      </p>

      {blockers.length ? (
        <ul className="space-y-2 text-sm text-foreground">
          {blockers.map((blocker) => (
            <li
              key={blocker}
              className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{blocker}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">차단 사유가 없습니다. 리뷰어가 바로 검토할 수 있습니다.</p>
      )}
    </div>
  );
}

function QualityGateSection({
  qualityGateStatus,
  builds,
  hasConflicts,
}: {
  qualityGateStatus: PullRequestQualityGateStatus;
  builds: BuildSummary[];
  hasConflicts: boolean;
}) {
  if (builds.length === 0) {
    return (
      <EmptyState
        title="링크된 빌드가 없습니다"
        description="빌드 동기화가 완료되면 품질 게이트 상태가 표시됩니다."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge descriptor={buildQualityGateBadge(qualityGateStatus, builds, hasConflicts)} />
        <span className="text-sm text-muted-foreground">
          {qualityGateStatus.mergeBlockedReasons.length
            ? qualityGateStatus.mergeBlockedReasons.join(' · ')
            : '차단 사유가 없습니다.'}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        필수 체크 {qualityGateStatus.requiredCheckPassingCount}/{qualityGateStatus.requiredCheckCount} · 정적
        분석 {qualityGateStatus.staticAnalysisStatus} · 릴리스 영향 {qualityGateStatus.releaseImpact ? '있음' : '없음'} · 병합 큐{' '}
        {qualityGateStatus.mergeQueueRequired ? '필요' : '불필요'}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <DetailList
          title="실패한 체크"
          items={qualityGateStatus.failingChecks}
          emptyLabel="실패한 체크가 없습니다"
        />
        <DetailList
          title="차단 사유"
          items={qualityGateStatus.mergeBlockedReasons}
          emptyLabel="차단 사유가 없습니다"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          title="성공"
          value={builds.filter((build) => build.status === 'success').length}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <MetricCard
          title="실패"
          value={builds.filter((build) => build.status === 'failed').length}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <MetricCard
          title="대기"
          value={builds.filter((build) => build.status === 'queued' || build.status === 'running').length}
          icon={<Clock3 className="h-4 w-4" />}
        />
      </div>
      <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
        {builds.map((build) => (
          <div key={build.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {build.provider} · {build.targetName}
              </span>
              {build.url ? (
                <a
                  className="text-xs text-primary hover:underline"
                  href={build.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  빌드 열기
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">빌드 링크 없음</span>
              )}
            </div>
            <StatusBadge descriptor={buildStatusBadge(build.status)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskAnalysisSection({ riskAnalysis }: { riskAnalysis: PullRequestRiskAnalysisState }) {
  if (riskAnalysis.kind === 'pending') {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          title="분석 중"
          description={`job ${riskAnalysis.data.jobId} · ${riskAnalysis.data.status}`}
          icon={<Clock3 className="h-5 w-5" />}
        />
        <p className="text-sm text-muted-foreground">
          위험도 분석이 아직 준비되지 않았습니다. 잠시 후 다시 확인하세요.
        </p>
      </div>
    );
  }

  if (riskAnalysis.kind === 'failed') {
    return <ErrorState title="위험도 분석을 불러오지 못했습니다" error={riskAnalysis.error} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge descriptor={riskBadge(riskAnalysis.data.riskLevel)} />
        <span className="text-sm text-muted-foreground">Risk score {riskAnalysis.data.score}</span>
      </div>
      <p className="text-sm text-foreground">{riskAnalysis.data.summary}</p>
      <div className="grid gap-4 lg:grid-cols-3">
        <DetailList
          title="신호"
          items={riskAnalysis.data.signals.map(
            (signal) => `${signal.summary} (${signal.severity}, +${signal.scoreContribution})`,
          )}
          emptyLabel="신호가 없습니다"
        />
        <DetailList
          title="추천 테스트"
          items={riskAnalysis.data.recommendedTests}
          emptyLabel="추천 테스트가 없습니다"
        />
        <DetailList
          title="영향 모듈"
          items={riskAnalysis.data.impactedModules}
          emptyLabel="영향 모듈이 없습니다"
        />
      </div>
    </div>
  );
}

function ReviewRecommendationsSection({
  reviewRecommendations,
}: {
  reviewRecommendations: PullRequestReviewRecommendationsState;
}) {
  if (reviewRecommendations.kind === 'failed') {
    return <ErrorState title="리뷰 추천을 불러오지 못했습니다" error={reviewRecommendations.error} />;
  }

  const { requiredCodeOwners, missingCodeOwners, recommendedReviewers, rationale } =
    reviewRecommendations.data;

  return (
    <div className="flex flex-col gap-4">
      {rationale.length ? (
        <ul className="flex flex-col gap-2 text-sm text-foreground">
          {rationale.map((line) => (
            <li key={line} className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
              {line}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">리뷰 추천 근거가 없습니다.</p>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <DetailList
          title="필수 CODEOWNERS"
          items={requiredCodeOwners}
          emptyLabel="필수 CODEOWNER가 없습니다"
        />
        <DetailList
          title="누락 CODEOWNERS"
          items={missingCodeOwners}
          emptyLabel="누락된 CODEOWNER가 없습니다"
        />
        <DetailList
          title="권장 리뷰어"
          items={recommendedReviewers.map((reviewer) => `${reviewer.displayName} (@${reviewer.login})`)}
          emptyLabel="권장 리뷰어가 없습니다"
        />
      </div>
    </div>
  );
}

function ActionPanel({
  detail,
  reviewBadge,
  gateBadge,
  riskAnalysis,
}: {
  detail: PullRequestDetailResponse['data'];
  reviewBadge: BadgeDescriptor;
  gateBadge: BadgeDescriptor;
  riskAnalysis: PullRequestRiskAnalysisState;
}) {
  return (
    <aside className="flex h-fit flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-vercel">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-foreground">액션 패널</h2>
        <p className="text-xs text-muted-foreground">
          Phase 6에서는 읽기 전용 동작만 제공합니다. 쓰기 액션은 이유를 함께 표시합니다.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <AnchorAction href={detail.githubUrl} label="Open in GitHub" />
        <AnchorAction href="#risk-analysis" label="위험도 분석으로 이동" />
        <AnchorAction href="#review-recommendations" label="리뷰 추천으로 이동" />
        <AnchorAction href="#quality-gates" label="품질 게이트로 이동" />
        <DisabledAction label="리뷰 요청" reason="리뷰 요청 쓰기 작업은 아직 연결되지 않았습니다." />
        <DisabledAction
          label="위험도 재분석"
          reason={
            riskAnalysis.kind === 'pending'
              ? '분석이 이미 진행 중입니다.'
              : '재분석 쓰기 작업은 아직 연결되지 않았습니다.'
          }
        />
        <DisabledAction label="PR 병합" reason="병합 쓰기 작업은 아직 연결되지 않았습니다." />
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge descriptor={reviewBadge} />
            <StatusBadge descriptor={gateBadge} />
          </div>
          <p className="text-xs text-muted-foreground">
            #{detail.pullRequest.number} · {detail.pullRequest.baseBranch} ← {detail.pullRequest.headBranch}
          </p>
        </div>
      </div>
    </aside>
  );
}

function AnchorAction({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target={href.startsWith('#') ? undefined : '_blank'}
      rel={href.startsWith('#') ? undefined : 'noreferrer'}
      className="inline-flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary/40"
    >
      <span>{label}</span>
      <Link2 className="h-4 w-4 text-muted-foreground/60" />
    </a>
  );
}

function DisabledAction({ label, reason }: { label: string; reason: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-dashed border-border bg-background px-3 py-2">
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="inline-flex items-center justify-between text-sm font-medium text-muted-foreground"
        title={reason}
      >
        <span>{label}</span>
        <span aria-hidden="true" className="text-[11px] uppercase tracking-wide">
          disabled
        </span>
      </button>
      <p className="text-xs text-muted-foreground">{reason}</p>
    </div>
  );
}

function DetailList({
  title,
  items,
  emptyLabel,
  icon,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        <span>{title}</span>
      </div>
      {items.length ? (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item} className="rounded-lg bg-secondary/40 px-3 py-2 text-sm text-foreground">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}

function buildReviewBadge(
  reviewStatus: PullRequestReviewStatus,
  reviewRecommendations: PullRequestReviewRecommendationsState,
): BadgeDescriptor {
  if (reviewRecommendations.kind === 'failed') {
    return {
      label: 'Review Unknown',
      tone: 'warning',
      description: '리뷰 추천 데이터 없음',
    };
  }

  if (!reviewStatus.codeOwnersSatisfied || !reviewStatus.checklistCompleted) {
    return {
      label: 'Review Needs Attention',
      tone: 'warning',
      description: 'CODEOWNERS 또는 체크리스트 보완 필요',
    };
  }

  if (reviewStatus.changesRequested > 0) {
    return {
      label: 'Changes Requested',
      tone: 'warning',
      description: '수정 요청 있음',
    };
  }

  if (
    reviewStatus.approvals > 0 &&
    reviewStatus.pendingReviewers.length === 0 &&
    reviewStatus.missingReviewers.length === 0
  ) {
    return {
      label: 'Review Ready',
      tone: 'success',
      description: '리뷰 준비 완료',
    };
  }

  if (reviewStatus.pendingReviewers.length > 0 || reviewStatus.missingReviewers.length > 0) {
    return {
      label: 'Review Pending',
      tone: 'info',
      description: '리뷰 요청 대기',
    };
  }

  return {
    label: 'Review Ready',
    tone: 'success',
    description: '리뷰 준비 완료',
  };
}

function buildQualityGateBadge(
  qualityGateStatus: PullRequestQualityGateStatus,
  builds: BuildSummary[],
  hasConflicts: boolean,
): BadgeDescriptor {
  if (hasConflicts) {
    return {
      label: 'Merge Blocked',
      tone: 'danger',
      description: '충돌 존재',
    };
  }

  if (qualityGateStatus.mergeBlockedReasons.length > 0) {
    return {
      label: 'Checks Blocked',
      tone: 'danger',
      description: '병합 차단 사유 존재',
    };
  }

  if (!qualityGateStatus.requiredChecksPassed || !qualityGateStatus.commitMessagePolicyPassed) {
    return {
      label: 'Checks Failed',
      tone: 'danger',
      description: '필수 체크 실패',
    };
  }

  if (qualityGateStatus.staticAnalysisStatus === 'failed') {
    return {
      label: 'Checks Failed',
      tone: 'danger',
      description: '정적 분석 실패',
    };
  }

  if (
    qualityGateStatus.staticAnalysisStatus === 'pending' ||
    qualityGateStatus.mergeQueueRequired ||
    builds.some((build) => build.status === 'queued' || build.status === 'running')
  ) {
    return {
      label: 'Checks Pending',
      tone: 'info',
      description: '품질 게이트 진행 중',
    };
  }

  return {
    label: 'Checks Passing',
    tone: 'success',
    description: '품질 게이트 통과',
  };
}

function buildReviewBlockers(
  reviewStatus: PullRequestReviewStatus,
  reviewRecommendations: PullRequestReviewRecommendationsState,
): string[] {
  const blockers: string[] = [];

  if (!reviewStatus.codeOwnersSatisfied) {
    blockers.push('CODEOWNERS 승인이 아직 충족되지 않았습니다.');
  }

  if (!reviewStatus.checklistCompleted) {
    blockers.push('체크리스트가 아직 완료되지 않았습니다.');
  }

  if (reviewStatus.changesRequested > 0) {
    blockers.push('수정 요청이 있습니다.');
  }

  if (reviewStatus.missingReviewers.length > 0) {
    blockers.push(`누락된 리뷰어: ${reviewStatus.missingReviewers.join(', ')}`);
  }

  if (reviewStatus.pendingReviewers.length > 0) {
    blockers.push(`대기 중인 리뷰어: ${reviewStatus.pendingReviewers.join(', ')}`);
  }

  if (reviewRecommendations.kind === 'ready' && reviewRecommendations.data.missingCodeOwners.length > 0) {
    blockers.push(`누락된 CODEOWNERS: ${reviewRecommendations.data.missingCodeOwners.join(', ')}`);
  }

  if (reviewRecommendations.kind === 'failed') {
    blockers.push('리뷰 추천 데이터를 불러오지 못했습니다.');
  }

  return blockers;
}

function buildSummaryLine(
  detail: PullRequestDetailResponse['data'],
  reviewBadge: BadgeDescriptor,
  gateBadge: BadgeDescriptor,
  riskAnalysis: PullRequestRiskAnalysisState,
): string {
  const reviewText = reviewBadge.description;
  const gateText = gateBadge.description;
  const riskText =
    riskAnalysis.kind === 'ready'
      ? `${riskBadge(riskAnalysis.data.riskLevel).description} · score ${riskAnalysis.data.score}`
      : riskAnalysis.kind === 'pending'
        ? `위험도 분석 ${riskAnalysis.data.status}`
        : '위험도 분석 실패';

  return `${detail.interpretedSummary} · ${reviewText} · ${gateText} · ${riskText}`;
}

function buildStatusBadge(status: BuildSummary['status']): BadgeDescriptor {
  switch (status) {
    case 'success':
      return { label: 'Success', tone: 'success', description: '빌드 성공' };
    case 'failed':
      return { label: 'Failure', tone: 'danger', description: '빌드 실패' };
    case 'queued':
      return { label: 'Queued', tone: 'info', description: '빌드 대기' };
    case 'running':
      return { label: 'Running', tone: 'info', description: '빌드 실행 중' };
    case 'cancelled':
      return { label: 'Cancelled', tone: 'neutral', description: '빌드 취소' };
    default:
      return { label: 'Unknown', tone: 'neutral', description: '알 수 없음' };
  }
}

function TagIcon() {
  return <span className="h-4 w-4 rounded-full border border-border bg-secondary" />;
}

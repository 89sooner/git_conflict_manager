import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  AlertTriangle,
  Clock,
  GitMerge,
  GitPullRequest,
  MessageSquareDiff,
  Play,
  ShieldAlert,
} from 'lucide-react';
import { pullRequestBadge, riskBadge, conflictBadge } from '@gsp/shared-types';
import type { PullRequestListResponse, PullRequestState } from '@gsp/shared-types';
import { listPullRequests } from '../lib/api';
import { ApiClientError } from '../lib/api/errors';
import { StatusBadge } from '../components/StatusBadge';
import { MetricCard } from '../components/MetricCard';
import { ListPanel } from '../components/ListPanel';
import { EmptyState, ErrorState } from '../components/states';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let response: PullRequestListResponse;
  try {
    response = await listPullRequests({ pageSize: 8 });
  } catch (error) {
    return (
      <ErrorState
        error={
          error instanceof Error
            ? error
            : new ApiClientError(
                {
                  code: 'INTERNAL_SERVER_ERROR',
                  message: '대시보드 데이터를 불러오지 못했습니다.',
                  retryable: true,
                },
                0,
              )
        }
      />
    );
  }

  const pullRequests = response.data;
  const openCount = pullRequests.filter((pr) => pr.state !== 'closed' && pr.state !== 'merged').length;
  const reviewCount = pullRequests.filter((pr) => pr.waitingForReview).length;
  const riskCount = pullRequests.filter((pr) => pr.riskLevel === 'high' || pr.riskLevel === 'critical').length;
  const conflictCount = pullRequests.filter((pr) => pr.hasConflicts).length;
  const recentPullRequests = pullRequests.slice(0, 2);
  const reviewRequestedPullRequests = pullRequests.filter((pr) => pr.waitingForReview).slice(0, 2);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col mb-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">내 작업 요약</h1>
        <p className="text-muted-foreground text-sm mt-1">
          오늘 처리해야 할 주요 변경 사항과 위험 항목입니다.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="오픈 PR" value={openCount} icon={<GitPullRequest className="h-4 w-4" />} />
        <MetricCard
          title="리뷰 대기"
          value={reviewCount}
          icon={<MessageSquareDiff className="h-4 w-4" />}
          trend={reviewCount > 0 ? '리뷰 요청 대기' : '대기 없음'}
          trendUp={reviewCount === 0}
        />
        <MetricCard
          title="위험 알림"
          value={riskCount}
          icon={<AlertTriangle className="h-4 w-4" />}
          trend={riskCount > 0 ? '고위험 PR 확인 필요' : '안정적'}
          trendUp={riskCount === 0}
        />
        <MetricCard title="충돌 PR" value={conflictCount} icon={<GitMerge className="h-4 w-4" />} />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ListPanel title="최근 PR">
          {recentPullRequests.length === 0 ? (
            <EmptyRow
              title="표시할 PR이 없습니다"
              description="GitHub App webhook으로 PR이 동기화되면 자동으로 표시됩니다."
            />
          ) : (
            recentPullRequests.map((pr) => (
              <ListRow key={pr.id} href={`/pulls/${pr.id}`}>
                <div className="flex flex-col gap-2">
                  <span className="font-medium text-foreground text-sm">
                    #{pr.number} {pr.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <StatusBadge descriptor={pullRequestBadge(toPullRequestState(pr.state))} />
                    <StatusBadge descriptor={riskBadge(pr.riskLevel)} />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                  <span>@{pr.author.login}</span>
                  {pr.hasConflicts ? <span>충돌 있음</span> : null}
                </div>
              </ListRow>
            ))
          )}
        </ListPanel>

        <ListPanel title="리뷰 요청 대기">
          {reviewRequestedPullRequests.length === 0 ? (
            <EmptyRow
              title="리뷰 요청 대기 중인 PR이 없습니다"
              description="대기 중인 PR은 여기에서 바로 확인할 수 있습니다."
            />
          ) : (
            reviewRequestedPullRequests.map((pr) => (
              <ListRow key={pr.id} href={`/pulls/${pr.id}`}>
                <div className="flex flex-col gap-2">
                  <span className="font-medium text-foreground text-sm">
                    #{pr.number} {pr.title}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      리뷰 대기
                    </span>
                    {pr.hasConflicts ? (
                      <StatusBadge descriptor={conflictBadge('detected')} />
                    ) : null}
                  </div>
                </div>
                <StatusBadge descriptor={riskBadge(pr.riskLevel)} />
              </ListRow>
            ))
          )}
        </ListPanel>

        <ListPanel title="최근 충돌 / Backout">
          <div className="flex items-center justify-between px-5 py-4 hover:bg-secondary/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-medium text-foreground text-sm">Rebase 충돌 발생</span>
                <span className="text-xs text-muted-foreground">feature/tx-queue 브랜치</span>
              </div>
            </div>
            <StatusBadge descriptor={conflictBadge('detected')} />
          </div>
        </ListPanel>

        <ListPanel title="빠른 실행" className="border-border bg-secondary/10">
          <div className="p-2 flex flex-col gap-1">
            <Link
              href="/pulls"
              className="inline-flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground rounded-lg hover:bg-card hover:shadow-vercel transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <div className="flex items-center gap-3">
                <Play className="h-4 w-4 text-muted-foreground/60" />
                PR 생성 보조 시작
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
            </Link>
            <Link
              href="/backouts"
              className="inline-flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground rounded-lg hover:bg-card hover:shadow-vercel transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-4 w-4 text-muted-foreground/60" />
                긴급 Backout 요청
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
            </Link>
          </div>
        </ListPanel>
      </section>
    </div>
  );
}

function toPullRequestState(state: string): PullRequestState {
  switch (state) {
    case 'draft':
    case 'open':
    case 'merged':
    case 'closed':
      return state;
    default:
      return 'open';
  }
}

function ListRow({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-5 py-4 hover:bg-secondary/40 transition-colors"
    >
      {children}
    </Link>
  );
}

function EmptyRow({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-5 py-6">
      <EmptyState title={title} description={description} />
    </div>
  );
}

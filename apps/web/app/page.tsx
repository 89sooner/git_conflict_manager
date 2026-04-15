import Link from 'next/link';
import {
  pullRequestBadge,
  riskBadge,
  conflictBadge,
} from '@gsp/shared-types';
import { StatusBadge } from '../components/StatusBadge';
import { MetricCard } from '../components/MetricCard';
import { ListPanel } from '../components/ListPanel';
import {
  GitPullRequest,
  MessageSquareDiff,
  AlertTriangle,
  GitMerge,
  ArrowRight,
  Clock,
  ShieldAlert,
  Play
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col mb-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">내 작업 요약</h1>
        <p className="text-muted-foreground text-sm mt-1">오늘 처리해야 할 주요 변경 사항과 위험 항목입니다.</p>
      </header>

      {/* Demo data notice — Phase 5 shell. Replace with real read model in Phase 6. */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700 flex items-center gap-2">
        <span className="font-semibold">데모 데이터</span>
        <span>이 대시보드의 수치와 목록은 Phase 5 셸 예시 데이터입니다. Phase 6에서 실제 read model로 교체됩니다.</span>
      </div>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="내 오픈 PR" value="3" icon={<GitPullRequest className="h-4 w-4" />} />
        <MetricCard title="내 리뷰 대기" value="5" icon={<MessageSquareDiff className="h-4 w-4" />} trend="2개 임박" trendUp={false} />
        <MetricCard title="위험 알림" value="1" icon={<AlertTriangle className="h-4 w-4" />} trend="+1 이번 주" trendUp={false} />
        <MetricCard title="최근 충돌" value="2" icon={<GitMerge className="h-4 w-4" />} />
      </section>

      {/* Panels */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        
        {/* 내 PR 현황 */}
        <ListPanel title="내 PR 현황">
          {/* Item 1 */}
          <div className="flex items-center justify-between px-5 py-4 hover:bg-secondary/40 transition-colors">
            <div className="flex flex-col gap-2">
              <span className="font-medium text-foreground text-sm">feat: implement new DMA driver</span>
              <div className="flex items-center gap-2">
                <StatusBadge descriptor={pullRequestBadge('under-review')} />
                <StatusBadge descriptor={riskBadge('medium')} />
              </div>
            </div>
            <Link href="/pulls" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
              리뷰 확인 <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {/* Item 2 */}
          <div className="flex items-center justify-between px-5 py-4 hover:bg-secondary/40 transition-colors">
            <div className="flex flex-col gap-2">
              <span className="font-medium text-foreground text-sm">fix: race condition in memory alloc</span>
              <div className="flex items-center gap-2">
                <StatusBadge descriptor={pullRequestBadge('changes-requested')} />
                <StatusBadge descriptor={riskBadge('high')} />
              </div>
            </div>
            <Link href="/pulls" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
              수정 필요 <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </ListPanel>

        {/* 리뷰 요청함 */}
        <ListPanel title="리뷰 요청함">
          <div className="flex items-center justify-between px-5 py-4 hover:bg-secondary/40 transition-colors">
            <div className="flex flex-col gap-2">
              <span className="font-medium text-foreground text-sm">refactor: clean up legacy network stack</span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> 2시간 전 요청</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-secondary font-semibold text-foreground">
                  CODEOWNERS
                </span>
              </div>
            </div>
            <Link href="/pulls" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
              리뷰 시작 <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </ListPanel>

        {/* 최근 충돌/Backout */}
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

        {/* 빠른 실행 */}
        <ListPanel title="빠른 실행" className="border-border bg-secondary/10">
          <div className="p-2 flex flex-col gap-1">
            <Link href="/pulls" className="inline-flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground rounded-lg hover:bg-card hover:shadow-vercel transition-all focus:outline-none focus:ring-2 focus:ring-primary/20">
              <div className="flex items-center gap-3">
                <Play className="h-4 w-4 text-muted-foreground/60" />
                PR 생성 보조 시작
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
            </Link>
            <Link href="/backouts" className="inline-flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground rounded-lg hover:bg-card hover:shadow-vercel transition-all focus:outline-none focus:ring-2 focus:ring-primary/20">
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

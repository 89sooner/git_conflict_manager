import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBackout } from '../../../lib/api/backouts';
import { backoutBadge } from '@gsp/shared-types';
import { StatusBadge } from '../../../components/StatusBadge';
import { ListPanel } from '../../../components/ListPanel';
import { ChevronLeft, GitPullRequest, GitCommit, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function BackoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  let detailResponse;
  try {
    detailResponse = await getBackout(id);
  } catch (err: any) {
    if (err.statusCode === 404) {
      notFound();
    }
    throw err;
  }

  const { backout, target, impactSummary, impactedModules, recommendedValidations, revertPullRequest } = detailResponse.data;
  const badge = backoutBadge(backout.status);

  return (
    <section className="flex flex-col gap-6 max-w-4xl">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/backouts" className="hover:text-foreground flex items-center transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" />
            목록으로
          </Link>
          <span>/</span>
          <span className="font-mono text-xs">{backout.id.split('-')[0]}</span>
        </div>
        
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
              {backout.targetBranch} 브랜치 복원
              <StatusBadge descriptor={badge} />
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Repository ID: {backout.repositoryId} • 요청자: {backout.createdBy.displayName} • {new Date(backout.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex flex-col gap-6">
          <ListPanel title="영향 분석" className="p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-primary" />
              영향 분석 요약
            </h2>
            <div className="bg-muted/30 border rounded-md p-4 text-sm leading-relaxed text-foreground">
              {impactSummary}
            </div>
            
            {impactedModules.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">영향받는 모듈</h3>
                <div className="flex flex-wrap gap-2">
                  {impactedModules.map(mod => (
                    <span key={mod} className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-md">
                      {mod}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </ListPanel>

          <ListPanel title="검증 절차" className="p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              추천 검증 절차
            </h2>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {recommendedValidations.map((val, idx) => (
                <li key={idx}>{val}</li>
              ))}
              {recommendedValidations.length === 0 && (
                <li>현재 권장되는 검증 절차가 없습니다.</li>
              )}
            </ul>
          </ListPanel>
        </div>

        <div className="flex flex-col gap-4">
          <ListPanel title="대상 정보" className="p-4 flex flex-col gap-3">
            <h3 className="text-sm font-semibold border-b pb-2">대상 정보</h3>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="font-medium text-foreground w-16">Source</span>
                {target.sourceType === 'pull_request' ? (
                  <span className="flex items-center gap-1"><GitPullRequest className="w-4 h-4" /> Pull Request</span>
                ) : (
                  <span className="flex items-center gap-1"><GitCommit className="w-4 h-4" /> Commits</span>
                )}
              </div>
              {target.pullRequestId && (
                <div className="flex flex-col gap-1 text-muted-foreground mt-1">
                  <span className="font-medium text-foreground text-xs uppercase">PR ID</span>
                  <span className="font-mono text-xs truncate" title={target.pullRequestId}>{target.pullRequestId}</span>
                </div>
              )}
              {target.commitShas.length > 0 && (
                <div className="flex flex-col gap-1 text-muted-foreground mt-1">
                  <span className="font-medium text-foreground text-xs uppercase">Commits</span>
                  <div className="flex flex-col gap-1">
                    {target.commitShas.map(sha => (
                      <span key={sha} className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded w-fit">{sha}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground mt-2">
                <span className="font-medium text-foreground w-16">Urgency</span>
                <span className={`capitalize ${backout.urgency === 'emergency' ? 'text-red-500 font-semibold' : ''}`}>
                  {backout.urgency}
                </span>
              </div>
            </div>
          </ListPanel>

          {revertPullRequest && (
            <ListPanel title="생성된 Revert PR" className="p-4 flex flex-col gap-3 border-primary/20 bg-primary/5">
              <h3 className="text-sm font-semibold border-b border-primary/10 pb-2 text-primary">Revert PR 생성됨</h3>
              <div className="flex flex-col gap-2 text-sm">
                <span className="font-medium truncate">{revertPullRequest.title}</span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="capitalize">{revertPullRequest.state}</span>
                  <span>•</span>
                  <span className="font-mono text-xs">#{revertPullRequest.number}</span>
                </div>
              </div>
            </ListPanel>
          )}

          <div className="p-4 bg-muted/30 border rounded-lg flex flex-col gap-3">
            <h3 className="text-sm font-semibold">액션</h3>
            {['draft', 'validating', 'pending-approval', 'approved', 'blocked', 'ready', 'failed'].includes(backout.status) && (
              <button className="w-full py-2 px-4 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md text-sm font-medium transition-colors">
                Cancel Backout
              </button>
            )}
            {backout.status === 'ready' && (
              <button className="w-full py-2 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium transition-colors">
                Generate Revert PR
              </button>
            )}
            {!['draft', 'validating', 'pending-approval', 'approved', 'blocked', 'ready', 'failed'].includes(backout.status) && backout.status !== 'ready' && (
              <p className="text-xs text-muted-foreground text-center">
                현재 상태에서는 실행 가능한 액션이 없습니다.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

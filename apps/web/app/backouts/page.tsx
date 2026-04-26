import Link from 'next/link';
import { listBackouts } from '../../lib/api/backouts';
import { backoutBadge } from '@gsp/shared-types';
import { StatusBadge } from '../../components/StatusBadge';
import { ListPanel } from '../../components/ListPanel';
import { EmptyState } from '../../components/states';
import { GitPullRequest, GitCommit, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function BackoutsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const repositoryId = typeof resolvedSearchParams.repositoryId === 'string' ? resolvedSearchParams.repositoryId : undefined;
  const status = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : undefined;

  const { data: backouts } = await listBackouts({ repositoryId, status });

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Backout Center</h1>
        <p className="text-sm text-muted-foreground mt-1">revert PR 요청과 진행 상태를 확인하고 관리합니다.</p>
      </header>

      {backouts.length === 0 ? (
        <EmptyState
          title="Backout 요청이 없습니다"
          description="현재 진행 중이거나 완료된 backout 요청이 없습니다."
        />
      ) : (
        <ListPanel title="Backout Requests">
          <ul className="divide-y divide-border">
            {backouts.map((backout) => {
              const badge = backoutBadge(backout.status);
              
              // Helper to map urgency to an icon/color
              const urgencyColor = 
                backout.urgency === 'emergency' ? 'text-red-500' :
                backout.urgency === 'high' ? 'text-orange-500' :
                'text-muted-foreground';

              return (
                <li key={backout.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <Link href={`/backouts/${backout.id}`} className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {backout.targetBranch} 브랜치 복원
                        </span>
                        <StatusBadge descriptor={badge} />
                        {backout.urgency !== 'normal' && (
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium border px-1.5 py-0.5 rounded-sm bg-background ${urgencyColor} border-${backout.urgency === 'emergency' ? 'red-200' : 'orange-200'}`}>
                            <AlertTriangle className="w-3 h-3" />
                            {backout.urgency.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="truncate" title={backout.repositoryId}>
                          {backout.repositoryId}
                        </span>
                        <span>•</span>
                        <span>요청자: {backout.createdBy.displayName}</span>
                        <span>•</span>
                        <span>{new Date(backout.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </ListPanel>
      )}
    </section>
  );
}

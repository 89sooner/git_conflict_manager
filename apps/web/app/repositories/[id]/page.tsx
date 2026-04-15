import Link from 'next/link';
import { ArrowLeft, GitBranch } from 'lucide-react';
import { riskBadge } from '@gsp/shared-types';
import type { BranchListResponse, RepositorySummaryResponse } from '@gsp/shared-types';
import { getRepository, listBranches } from '../../../lib/api';
import { ApiClientError } from '../../../lib/api/errors';
import { StatusBadge } from '../../../components/StatusBadge';
import { EmptyState, ErrorState } from '../../../components/states';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RepositoryDetailPage({ params }: PageProps) {
  const { id } = await params;

  let repoResponse: RepositorySummaryResponse;
  let branchResponse: BranchListResponse | null = null;
  try {
    [repoResponse, branchResponse] = await Promise.all([
      getRepository(id),
      listBranches(id, { pageSize: 100 }),
    ]);
  } catch (error) {
    return (
      <section className="flex flex-col gap-4">
        <BackLink />
        <ErrorState
          error={
            error instanceof Error
              ? error
              : new ApiClientError(
                  {
                    code: 'REPOSITORY_NOT_FOUND',
                    message: '저장소를 찾을 수 없습니다.',
                    retryable: false,
                  },
                  404,
                )
          }
        />
      </section>
    );
  }

  const repo = repoResponse.data;
  const branches = branchResponse?.data ?? [];

  return (
    <section className="flex flex-col gap-6">
      <BackLink />
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{repo.fullName}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>기본 브랜치 {repo.defaultBranch}</span>
            <span>·</span>
            <span>오픈 PR {repo.openPullRequestCount}</span>
            <span>·</span>
            <span>오래된 브랜치 {repo.staleBranchCount}</span>
          </div>
        </div>
        <StatusBadge descriptor={riskBadge(repo.riskLevel)} />
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">브랜치</h2>
        {branches.length === 0 ? (
          <EmptyState
            title="동기화된 브랜치가 없습니다"
            description="GitHub App webhook 또는 동기화 작업이 완료되면 표시됩니다."
          />
        ) : (
          <div className="flex flex-col divide-y divide-border/50 rounded-xl border border-border bg-card shadow-vercel">
            {branches.map((branch) => (
              <div key={branch.name} className="flex items-center justify-between px-5 py-4 hover:bg-secondary/20 transition-colors">
                <div className="flex items-center gap-3">
                  <GitBranch className="h-4 w-4 text-muted-foreground/60" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">{branch.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {branch.kind} · ahead {branch.aheadBy} · behind {branch.behindBy}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {branch.isProtected ? (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Protected
                    </span>
                  ) : null}
                  {branch.isStale ? (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Stale
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function BackLink() {
  return (
    <Link
      href="/repositories"
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="h-3 w-3" /> 저장소 목록
    </Link>
  );
}

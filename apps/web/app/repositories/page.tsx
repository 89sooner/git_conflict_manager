import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { riskBadge } from '@gsp/shared-types';
import type { RepositoryListResponse } from '@gsp/shared-types';
import { listRepositories } from '../../lib/api';
import { ApiClientError } from '../../lib/api/errors';
import { StatusBadge } from '../../components/StatusBadge';
import { EmptyState, ErrorState } from '../../components/states';

export const dynamic = 'force-dynamic';

export default async function RepositoriesPage() {
  let response: RepositoryListResponse;
  try {
    response = await listRepositories({ pageSize: 50 });
  } catch (error) {
    return (
      <section className="flex flex-col gap-4">
        <Header />
        <ErrorState
          error={error instanceof Error ? error : new ApiClientError({ code: 'INTERNAL_SERVER_ERROR', message: '저장소 목록을 불러오지 못했습니다.', retryable: true }, 0)}
        />
      </section>
    );
  }

  const repositories = response.data;

  return (
    <section className="flex flex-col gap-4">
      <Header total={response.meta.total ?? repositories.length} />
      {repositories.length === 0 ? (
        <EmptyState
          title="등록된 저장소가 없습니다"
          description="GitHub App을 설치하면 저장소가 자동으로 동기화됩니다."
        />
      ) : (
        <div className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {repositories.map((repo) => (
            <Link
              key={repo.id}
              href={`/repositories/${repo.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-slate-50"
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-slate-900">{repo.fullName}</span>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>기본 브랜치 {repo.defaultBranch}</span>
                  <span>·</span>
                  <span>오픈 PR {repo.openPullRequestCount}</span>
                  <span>·</span>
                  <span>오래된 브랜치 {repo.staleBranchCount}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge descriptor={riskBadge(repo.riskLevel)} />
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function Header({ total }: { total?: number }) {
  return (
    <header className="flex items-end justify-between">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">저장소</h1>
        <p className="text-sm text-slate-500 mt-1">
          {typeof total === 'number' ? `${total}개 저장소` : '동기화된 저장소 목록'}
        </p>
      </div>
    </header>
  );
}

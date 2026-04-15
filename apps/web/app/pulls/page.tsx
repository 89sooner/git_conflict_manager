import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { pullRequestBadge, riskBadge } from '@gsp/shared-types';
import type { PullRequestListResponse, PullRequestState } from '@gsp/shared-types';
import { listPullRequests } from '../../lib/api';
import { ApiClientError } from '../../lib/api/errors';
import { StatusBadge } from '../../components/StatusBadge';
import { EmptyState, ErrorState } from '../../components/states';

export const dynamic = 'force-dynamic';

export default async function PullRequestsPage() {
  let response: PullRequestListResponse;
  try {
    response = await listPullRequests({ pageSize: 50 });
  } catch (error) {
    return (
      <section className="flex flex-col gap-4">
        <Header />
        <ErrorState
          error={
            error instanceof Error
              ? error
              : new ApiClientError(
                  {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'PR 목록을 불러오지 못했습니다.',
                    retryable: true,
                  },
                  0,
                )
          }
        />
      </section>
    );
  }

  const pullRequests = response.data;

  return (
    <section className="flex flex-col gap-4">
      <Header total={response.meta.total ?? pullRequests.length} />
      {pullRequests.length === 0 ? (
        <EmptyState
          title="조건에 맞는 PR이 없습니다"
          description="webhook으로 PR이 동기화되면 자동으로 표시됩니다."
        />
      ) : (
        <div className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {pullRequests.map((pr) => (
            <Link
              key={pr.id}
              href={`/pulls/${pr.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-slate-50"
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-slate-900">
                  #{pr.number} {pr.title}
                </span>
                <div className="flex items-center gap-2">
                  <StatusBadge descriptor={pullRequestBadge(toPullRequestState(pr.state))} />
                  <StatusBadge descriptor={riskBadge(pr.riskLevel)} />
                  <span className="text-xs text-slate-500">{pr.author.login}</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function toPullRequestState(state: string): PullRequestState {
  // Read-model 'PullRequestViewState' (open|closed|merged|draft) is a subset of
  // domain 'PullRequestState'. Map view states to the closest badge state.
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

function Header({ total }: { total?: number }) {
  return (
    <header className="flex items-end justify-between">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pull Requests</h1>
        <p className="text-sm text-slate-500 mt-1">
          {typeof total === 'number' ? `${total}개 PR` : '동기화된 PR 목록'}
        </p>
      </div>
    </header>
  );
}

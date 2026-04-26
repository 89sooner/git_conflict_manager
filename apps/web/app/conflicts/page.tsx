import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { conflictBadge, conflictTypeBadge } from '@gsp/shared-types';
import type { ConflictCaseListResponse } from '@gsp/shared-types';
import { listConflicts } from '../../lib/api';
import { ApiClientError } from '../../lib/api/errors';
import { StatusBadge } from '../../components/StatusBadge';
import { EmptyState, ErrorState } from '../../components/states';

export const dynamic = 'force-dynamic';

export default async function ConflictsPage() {
  let response: ConflictCaseListResponse;
  try {
    response = await listConflicts();
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
                    message: '충돌 사례 목록을 불러오지 못했습니다.',
                    retryable: true,
                  },
                  0,
                )
          }
        />
      </section>
    );
  }

  const conflicts = response.data;

  return (
    <section className="flex flex-col gap-4">
      <Header total={response.meta.total ?? conflicts.length} />
      {conflicts.length === 0 ? (
        <EmptyState
          title="현재 열린 충돌 사례가 없습니다"
          description="webhook으로 충돌이 감지되면 자동으로 표시됩니다."
        />
      ) : (
        <div className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {conflicts.map((c) => (
            <Link
              key={c.id}
              href={`/conflicts/${c.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-slate-50"
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-slate-900">
                  {c.branchName} → {c.baseBranch}
                </span>
                <div className="flex items-center gap-2">
                  <StatusBadge descriptor={conflictTypeBadge(c.type)} />
                  <StatusBadge descriptor={conflictBadge(c.status)} />
                  <span className="text-xs text-slate-500">
                    {c.conflictingFileCount}개 파일
                  </span>
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

function Header({ total }: { total?: number }) {
  return (
    <header className="flex items-end justify-between">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Conflict Cases</h1>
        <p className="text-sm text-slate-500 mt-1">
          {typeof total === 'number'
            ? `${total}개 충돌 사례`
            : '충돌 사례와 해결 가이드 목록입니다.'}
        </p>
      </div>
    </header>
  );
}

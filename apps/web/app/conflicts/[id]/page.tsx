import Link from 'next/link';
import { ArrowLeft, AlertTriangle, CheckCircle2, RefreshCw, ExternalLink } from 'lucide-react';
import { conflictBadge, conflictTypeBadge } from '@gsp/shared-types';
import type { ConflictCaseDetailResponse, ConflictCaseDetail } from '@gsp/shared-types';
import { getConflictCase } from '../../../lib/api';
import { ApiClientError } from '../../../lib/api/errors';
import { StatusBadge } from '../../../components/StatusBadge';
import { ErrorState } from '../../../components/states';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ConflictDetailPage({ params }: Props) {
  const { id } = await params;

  let response: ConflictCaseDetailResponse;
  try {
    response = await getConflictCase(id);
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
                    code: 'CONFLICT_CASE_NOT_FOUND',
                    message: '충돌 사례를 불러오지 못했습니다.',
                    retryable: false,
                  },
                  404,
                )
          }
        />
      </section>
    );
  }

  const detail = response.data;
  const c = detail.conflict;

  return (
    <section className="flex flex-col gap-6">
      <BackLink />

      {/* Header */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <StatusBadge descriptor={conflictTypeBadge(c.type)} />
          <StatusBadge descriptor={conflictBadge(c.status)} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {c.branchName} → {c.baseBranch}
        </h1>
        <p className="text-sm text-slate-600">{detail.interpretedStatus}</p>
      </header>

      {/* Stale Warning */}
      {c.status === 'stale' && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">재분석이 필요합니다</p>
            <p className="text-xs text-amber-700 mt-1">
              원본 브랜치가 변경되어 기존 가이드가 유효하지 않습니다.
            </p>
          </div>
        </div>
      )}

      {/* Git Concept Hint */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-medium text-slate-500 mb-1">Git 개념 힌트</p>
        <p className="text-sm text-slate-700">{detail.gitConceptHint}</p>
      </div>

      {/* Conflicting Files */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">
            충돌 파일 ({detail.conflictingFiles.length})
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {detail.conflictingFiles.map((file) => (
            <div key={file.path} className="px-5 py-3 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <code className="text-sm text-slate-800 font-mono">{file.path}</code>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{file.fileType}</span>
                  {file.conflictReason && (
                    <span className="text-xs text-slate-400">({file.conflictReason})</span>
                  )}
                  {file.ownerTeam && (
                    <span className="text-xs text-slate-500">→ {file.ownerTeam}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {file.generated && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                    generated
                  </span>
                )}
                {file.hotspotScore != null && (
                  <span className="text-xs text-slate-400">
                    hotspot: {file.hotspotScore}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Guidance Steps */}
      {detail.guidance.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="px-5 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">해결 가이드</h2>
          </div>
          <div className="px-5 py-4 space-y-2">
            {detail.guidance.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recovery Actions */}
      {detail.recoveryActions.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="px-5 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">복구 경로</h2>
          </div>
          <div className="px-5 py-4 space-y-2">
            {detail.recoveryActions.map((action, i) => (
              <div key={i} className="flex items-start gap-2">
                <RefreshCw className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-600 font-mono">{action}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Escalation */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">도움 요청</h2>
        </div>
        <div className="px-5 py-4">
          {detail.escalation.available ? (
            <div className="flex items-center gap-3">
              {detail.escalation.targetTeam && (
                <span className="text-sm text-slate-700">
                  담당 팀: <strong>{detail.escalation.targetTeam}</strong>
                </span>
              )}
              {detail.escalation.guideUrl && (
                <a
                  href={detail.escalation.guideUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  가이드 문서 <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              {detail.escalation.disabledReason ?? 'Escalation을 사용할 수 없습니다.'}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function BackLink() {
  return (
    <Link
      href="/conflicts"
      className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
    >
      <ArrowLeft className="h-4 w-4" />
      충돌 목록으로
    </Link>
  );
}

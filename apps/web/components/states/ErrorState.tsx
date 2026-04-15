'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { normalizeError } from '../../lib/api/errors';
import { cn } from '../../lib/utils';

export interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
  title?: string;
}

export function ErrorState({ error, onRetry, className, title }: ErrorStateProps) {
  const normalized = normalizeError(error);
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-6 py-12 text-center',
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-rose-900">{title ?? '데이터를 불러오지 못했습니다'}</p>
        <p className="text-xs text-rose-700">{normalized.message}</p>
        <p className="text-[11px] font-mono text-rose-500">코드: {normalized.code}</p>
        {normalized.userAction ? (
          <p className="text-xs text-rose-700 mt-1">{normalized.userAction}</p>
        ) : null}
      </div>
      {onRetry && normalized.retryable ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
        >
          <RefreshCw className="h-3 w-3" /> 다시 시도
        </button>
      ) : null}
    </div>
  );
}

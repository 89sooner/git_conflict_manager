import { cn } from '../../lib/utils';

export interface DetailSkeletonProps {
  className?: string;
}

export function DetailSkeleton({ className }: DetailSkeletonProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-6 lg:grid-cols-3', className)}>
      <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 flex flex-col gap-4">
        <div className="h-5 w-1/3 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col gap-3">
        <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
        <div className="h-8 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-8 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-8 w-full animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

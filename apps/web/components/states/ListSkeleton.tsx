import { cn } from '../../lib/utils';

export interface ListSkeletonProps {
  rows?: number;
  className?: string;
}

export function ListSkeleton({ rows = 5, className }: ListSkeletonProps) {
  return (
    <div className={cn('flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-5 py-4">
          <div className="flex flex-col gap-2 w-2/3">
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
            <div className="flex gap-2">
              <div className="h-4 w-16 animate-pulse rounded-full bg-slate-100" />
              <div className="h-4 w-12 animate-pulse rounded-full bg-slate-100" />
            </div>
          </div>
          <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

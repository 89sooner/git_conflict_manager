import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center',
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {description ? <p className="text-xs text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

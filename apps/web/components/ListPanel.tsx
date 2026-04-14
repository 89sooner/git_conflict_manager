import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

interface ListPanelProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ListPanel({ title, action, children, className }: ListPanelProps) {
  return (
    <div className={cn("flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {action && <div>{action}</div>}
      </div>
      <div className="flex flex-col divide-y divide-slate-100">
        {children}
      </div>
    </div>
  );
}

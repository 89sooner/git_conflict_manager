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
    <div className={cn("flex flex-col rounded-xl border border-border bg-card shadow-vercel overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-secondary/20">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {action && <div>{action}</div>}
      </div>
      <div className="flex flex-col divide-y divide-border/50">
        {children}
      </div>
    </div>
  );
}

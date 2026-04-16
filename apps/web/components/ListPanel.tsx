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
    <div className={cn("flex flex-col rounded-xl border border-border/60 bg-card/50 shadow-sm overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b border-border/40 px-5 py-3.5 bg-muted/20">
        <h3 className="text-sm font-medium tracking-tight text-foreground">{title}</h3>
        {action && <div>{action}</div>}
      </div>
      <div className="flex flex-col divide-y divide-border/50">
        {children}
      </div>
    </div>
  );
}

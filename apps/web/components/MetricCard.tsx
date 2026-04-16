import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function MetricCard({ title, value, icon, trend, trendUp, className }: MetricCardProps) {
  return (
    <div className={cn("flex flex-col rounded-xl border border-border/60 bg-card/50 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-border/80", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium tracking-tight text-muted-foreground">{title}</h3>
        {icon && <div className="text-muted-foreground/50">{icon}</div>}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-3xl font-semibold tracking-tight text-foreground">{value}</span>
        {trend && (
          <span className={cn("text-xs font-medium", trendUp ? "text-emerald-600" : "text-rose-600")}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

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
    <div className={cn("rounded-xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-500">{title}</h3>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-3xl font-semibold tracking-tight text-slate-900">{value}</span>
        {trend && (
          <span className={cn("text-xs font-medium", trendUp ? "text-emerald-600" : "text-rose-600")}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

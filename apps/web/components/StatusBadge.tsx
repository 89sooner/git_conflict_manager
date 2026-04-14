import type { CSSProperties } from 'react';
import type { BadgeDescriptor } from '@gsp/shared-types';
import { BADGE_TONE_STYLES } from '@gsp/config';
import { cn } from '../lib/utils';

export interface StatusBadgeProps {
  descriptor: BadgeDescriptor;
  title?: string;
  className?: string;
}

export function StatusBadge({ descriptor, title, className }: StatusBadgeProps) {
  const palette = BADGE_TONE_STYLES[descriptor.tone];
  const style: CSSProperties = {
    backgroundColor: palette.bg,
    color: palette.fg,
    borderColor: palette.border,
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap",
        className
      )}
      style={style}
      data-tone={descriptor.tone}
      title={title ?? descriptor.description}
    >
      {descriptor.label}
    </span>
  );
}

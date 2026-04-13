import type { CSSProperties } from 'react';
import type { BadgeDescriptor } from '@gsp/shared-types';
import { BADGE_TONE_STYLES } from '@gsp/config';

export interface StatusBadgeProps {
  descriptor: BadgeDescriptor;
  title?: string;
}

export function StatusBadge({ descriptor, title }: StatusBadgeProps) {
  const palette = BADGE_TONE_STYLES[descriptor.tone];
  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '2px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: '20px',
    backgroundColor: palette.bg,
    color: palette.fg,
    border: `1px solid ${palette.border}`,
  };
  return (
    <span
      style={style}
      data-tone={descriptor.tone}
      title={title ?? descriptor.description}
    >
      {descriptor.label}
    </span>
  );
}

import type { BadgeTone } from '@gsp/shared-types';

export const appConfig = {
  appName: 'Git Migration Support Platform',
  shortName: 'GSP',
  api: {
    basePath: '/api/v1',
  },
  navigation: [
    { key: 'pulls', label: 'Pull Requests', href: '/pulls' },
    { key: 'conflicts', label: 'Conflicts', href: '/conflicts' },
    { key: 'backouts', label: 'Backouts', href: '/backouts' },
    { key: 'policies', label: 'Policies', href: '/policies' },
    { key: 'jobs', label: 'Jobs', href: '/jobs' },
  ],
} as const;

export type NavItem = (typeof appConfig.navigation)[number];

/**
 * Badge tone CSS variables — frontend components consume these tokens directly
 * so badge color rules stay in one place. Real palette decisions live in the
 * design system; the values below are placeholder dev defaults.
 */
export const BADGE_TONE_STYLES: Record<BadgeTone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: '#f1f5f9', fg: '#475569', border: '#cbd5e1' },
  info: { bg: '#dbeafe', fg: '#1d4ed8', border: '#93c5fd' },
  success: { bg: '#dcfce7', fg: '#166534', border: '#86efac' },
  warning: { bg: '#ffedd5', fg: '#9a3412', border: '#fdba74' },
  danger: { bg: '#fee2e2', fg: '#991b1b', border: '#fca5a5' },
  queue: { bg: '#ede9fe', fg: '#5b21b6', border: '#c4b5fd' },
};

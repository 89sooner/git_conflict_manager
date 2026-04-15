import type { BadgeTone } from '@gsp/shared-types';

export const appConfig = {
  appName: 'Git Migration Support Platform',
  shortName: 'GSP',
  api: {
    basePath: '/api/v1',
  },
  navigation: [
    { key: 'dashboard', label: '홈', href: '/' },
    { key: 'repositories', label: '저장소', href: '/repositories' },
    { key: 'pulls', label: 'Pull Requests', href: '/pulls' },
    { key: 'conflicts', label: 'Conflicts', href: '/conflicts' },
    { key: 'backouts', label: 'Backouts', href: '/backouts' },
  ],
} as const;

export type NavItem = (typeof appConfig.navigation)[number];

/**
 * Badge tone CSS variables — frontend components consume these tokens directly
 * so badge color rules stay in one place. Real palette decisions live in the
 * design system; the values below are placeholder dev defaults.
 */
export const BADGE_TONE_STYLES: Record<BadgeTone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: '#f4f4f5', fg: '#18181b', border: '#e4e4e7' },
  info: { bg: '#eff6ff', fg: '#1e3a8a', border: '#bfdbfe' },
  success: { bg: '#ecfdf5', fg: '#065f46', border: '#a7f3d0' },
  warning: { bg: '#fffbeb', fg: '#92400e', border: '#fde68a' },
  danger: { bg: '#fef2f2', fg: '#991b1b', border: '#fecaca' },
  queue: { bg: '#f5f3ff', fg: '#5b21b6', border: '#ddd6fe' },
};

import { describe, it, expect } from 'vitest';
import {
  BACKOUT_STATE_BADGES,
  BACKOUT_STATES,
  PR_STATE_BADGES,
  RISK_BADGES,
  type BackoutState,
  type BadgeTone,
  type PullRequestState,
  type RiskLevel,
} from '@gsp/shared-types';

const PR_STATES: PullRequestState[] = [
  'draft',
  'open',
  'under-review',
  'changes-requested',
  'approved',
  'merge-blocked',
  'ready-to-merge',
  'queued-for-merge',
  'merged',
  'closed',
  'reverted',
];

const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high', 'critical'];

const ALLOWED_TONES: readonly BadgeTone[] = [
  'neutral',
  'info',
  'success',
  'warning',
  'danger',
  'queue',
];

describe('badge mappings', () => {
  it('covers every PR business state', () => {
    for (const state of PR_STATES) {
      const descriptor = PR_STATE_BADGES[state];
      expect(descriptor).toBeDefined();
      expect(descriptor.label).toBeTruthy();
      expect(ALLOWED_TONES).toContain(descriptor.tone);
    }
    expect(Object.keys(PR_STATE_BADGES).sort()).toEqual([...PR_STATES].sort());
  });

  it('covers every risk level', () => {
    for (const level of RISK_LEVELS) {
      const descriptor = RISK_BADGES[level];
      expect(descriptor).toBeDefined();
      expect(ALLOWED_TONES).toContain(descriptor.tone);
    }
  });

  it('covers every backout state', () => {
    for (const state of BACKOUT_STATES) {
      const descriptor = BACKOUT_STATE_BADGES[state as BackoutState];
      expect(descriptor).toBeDefined();
      expect(ALLOWED_TONES).toContain(descriptor.tone);
    }
    expect(Object.keys(BACKOUT_STATE_BADGES).sort()).toEqual([...BACKOUT_STATES].sort());
  });
});

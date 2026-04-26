import { describe, expect, it } from 'vitest';
import {
  isValidBackoutTransition,
  validateBackoutRequest,
  type BackoutValidationContext,
} from '../src/jobs/backoutValidation.js';
import type { BackoutState } from '@gsp/shared-types';
import { BACKOUT_STATES } from '@gsp/shared-types';

// ── isValidBackoutTransition ────────────────────────────────────────────────

describe('isValidBackoutTransition', () => {
  it('allows draft → validating', () => {
    expect(isValidBackoutTransition('draft', 'validating')).toBe(true);
  });

  it('allows draft → cancelled', () => {
    expect(isValidBackoutTransition('draft', 'cancelled')).toBe(true);
  });

  it('denies draft → merged', () => {
    expect(isValidBackoutTransition('draft', 'merged')).toBe(false);
  });

  it('allows validating → pending-approval', () => {
    expect(isValidBackoutTransition('validating', 'pending-approval')).toBe(true);
  });

  it('allows validating → ready', () => {
    expect(isValidBackoutTransition('validating', 'ready')).toBe(true);
  });

  it('allows validating → blocked', () => {
    expect(isValidBackoutTransition('validating', 'blocked')).toBe(true);
  });

  it('denies validating → merged', () => {
    expect(isValidBackoutTransition('validating', 'merged')).toBe(false);
  });

  it('allows pending-approval → approved', () => {
    expect(isValidBackoutTransition('pending-approval', 'approved')).toBe(true);
  });

  it('allows pending-approval → cancelled', () => {
    expect(isValidBackoutTransition('pending-approval', 'cancelled')).toBe(true);
  });

  it('allows approved → ready', () => {
    expect(isValidBackoutTransition('approved', 'ready')).toBe(true);
  });

  it('allows blocked → ready', () => {
    expect(isValidBackoutTransition('blocked', 'ready')).toBe(true);
  });

  it('allows blocked → pending-approval', () => {
    expect(isValidBackoutTransition('blocked', 'pending-approval')).toBe(true);
  });

  it('allows ready → pr-generating', () => {
    expect(isValidBackoutTransition('ready', 'pr-generating')).toBe(true);
  });

  it('allows pr-generating → pr-open', () => {
    expect(isValidBackoutTransition('pr-generating', 'pr-open')).toBe(true);
  });

  it('allows pr-generating → failed', () => {
    expect(isValidBackoutTransition('pr-generating', 'failed')).toBe(true);
  });

  it('allows pr-open → merged', () => {
    expect(isValidBackoutTransition('pr-open', 'merged')).toBe(true);
  });

  it('allows pr-open → queued-for-merge', () => {
    expect(isValidBackoutTransition('pr-open', 'queued-for-merge')).toBe(true);
  });

  it('allows queued-for-merge → merged', () => {
    expect(isValidBackoutTransition('queued-for-merge', 'merged')).toBe(true);
  });

  it('denies merged → anything', () => {
    for (const state of BACKOUT_STATES) {
      expect(isValidBackoutTransition('merged', state)).toBe(false);
    }
  });

  it('denies cancelled → anything', () => {
    for (const state of BACKOUT_STATES) {
      expect(isValidBackoutTransition('cancelled', state)).toBe(false);
    }
  });

  it('allows failed → cancelled', () => {
    expect(isValidBackoutTransition('failed', 'cancelled')).toBe(true);
  });

  it('denies failed → ready', () => {
    expect(isValidBackoutTransition('failed', 'ready')).toBe(false);
  });
});

// ── validateBackoutRequest ──────────────────────────────────────────────────

describe('validateBackoutRequest', () => {
  const baseCtx: BackoutValidationContext = {
    backoutId: 'test-backout-001',
    currentStatus: 'validating',
    targetBranch: 'main',
    urgency: 'normal',
    hasApprovers: false,
    targetExists: true,
  };

  it('returns ready for non-release branch with valid target', () => {
    const result = validateBackoutRequest(baseCtx);
    expect(result.nextStatus).toBe('ready');
    expect(result.requiresApproval).toBe(false);
    expect(result.conflictRisk).toBe('low');
  });

  it('returns pending-approval for release branch', () => {
    const result = validateBackoutRequest({
      ...baseCtx,
      targetBranch: 'release/2026.04',
      hasApprovers: true,
    });
    expect(result.nextStatus).toBe('pending-approval');
    expect(result.requiresApproval).toBe(true);
    expect(result.conflictRisk).toBe('medium');
  });

  it('returns blocked when release branch has no approvers', () => {
    const result = validateBackoutRequest({
      ...baseCtx,
      targetBranch: 'release/2026.04',
      hasApprovers: false,
    });
    expect(result.nextStatus).toBe('blocked');
    expect(result.requiresApproval).toBe(true);
  });

  it('returns blocked when target does not exist', () => {
    const result = validateBackoutRequest({
      ...baseCtx,
      targetExists: false,
    });
    expect(result.nextStatus).toBe('blocked');
    expect(result.reason).toContain('not found');
  });

  it('adds emergency warning for urgent requests', () => {
    const result = validateBackoutRequest({
      ...baseCtx,
      urgency: 'emergency',
    });
    expect(result.nextStatus).toBe('ready');
    expect(result.warnings.some((w) => w.includes('긴급'))).toBe(true);
  });

  it('does not validate if not in validating state', () => {
    const result = validateBackoutRequest({
      ...baseCtx,
      currentStatus: 'draft',
    });
    expect(result.nextStatus).toBe('draft');
    expect(result.reason).toContain('expected');
  });
});

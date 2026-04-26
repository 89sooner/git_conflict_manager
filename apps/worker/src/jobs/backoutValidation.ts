/**
 * Backout Validation Job — Phase 8
 *
 * Validates backout requests and determines next state:
 *   draft → validating → ready (non-release branch)
 *   draft → validating → pending-approval (release branch)
 *   draft → validating → blocked (validation failed)
 *
 * State transitions mirror docs/03-api/state_transition_spec.md §7.
 * Worker only produces domain state + validation metadata, never UI text.
 */

import type { BackoutState, BackoutUrgency } from '@gsp/shared-types';

/** Allowed state transitions — mirrors state_transition_spec.md §7.3 */
const BACKOUT_TRANSITIONS: Record<BackoutState, BackoutState[]> = {
  'draft': ['validating', 'cancelled'],
  'validating': ['pending-approval', 'ready', 'blocked'],
  'pending-approval': ['approved', 'blocked', 'cancelled'],
  'approved': ['ready', 'cancelled'],
  'blocked': ['ready', 'pending-approval', 'cancelled'],
  'ready': ['pr-generating', 'cancelled'],
  'pr-generating': ['pr-open', 'failed'],
  'pr-open': ['queued-for-merge', 'merged'],
  'queued-for-merge': ['merged'],
  'merged': [],
  'failed': ['cancelled'],
  'cancelled': [],
};

/**
 * Check whether a backout state transition is valid.
 */
export function isValidBackoutTransition(
  current: BackoutState,
  next: BackoutState,
): boolean {
  return BACKOUT_TRANSITIONS[current]?.includes(next) ?? false;
}

export interface BackoutValidationContext {
  backoutId: string;
  currentStatus: BackoutState;
  targetBranch: string;
  urgency: BackoutUrgency;
  hasApprovers: boolean;
  targetExists: boolean;
}

export interface BackoutValidationResult {
  nextStatus: BackoutState;
  reason: string;
  warnings: string[];
  requiresApproval: boolean;
  conflictRisk: 'low' | 'medium' | 'high' | 'unknown';
}

function isReleaseBranch(branch: string): boolean {
  return branch.startsWith('release/');
}

/**
 * Validate a backout request and determine the next state.
 * Worker stores the result — never produces UI text directly.
 */
export function validateBackoutRequest(
  ctx: BackoutValidationContext,
): BackoutValidationResult {
  const warnings: string[] = [];

  // Gate: must be in validating state
  if (ctx.currentStatus !== 'validating') {
    return {
      nextStatus: ctx.currentStatus,
      reason: `Cannot validate from status '${ctx.currentStatus}'; expected 'validating'`,
      warnings: [],
      requiresApproval: false,
      conflictRisk: 'unknown',
    };
  }

  // Check: target existence
  if (!ctx.targetExists) {
    return {
      nextStatus: 'blocked',
      reason: 'Target PR or commits not found in repository',
      warnings: [],
      requiresApproval: false,
      conflictRisk: 'unknown',
    };
  }

  // Check: release branch requires approval
  const needsApproval = isReleaseBranch(ctx.targetBranch);

  if (needsApproval && !ctx.hasApprovers) {
    return {
      nextStatus: 'blocked',
      reason: 'Release branch backout requires at least one approver',
      warnings: ['Release branch backout은 승인권자 지정이 필수입니다.'],
      requiresApproval: true,
      conflictRisk: 'unknown',
    };
  }

  // Conflict risk estimation (placeholder — Phase 8 uses heuristic)
  let conflictRisk: 'low' | 'medium' | 'high' | 'unknown' = 'low';
  if (needsApproval) {
    conflictRisk = 'medium';
    warnings.push('Release branch revert는 후속 커밋과의 충돌 가능성이 있습니다.');
  }

  if (ctx.urgency === 'emergency') {
    warnings.push('긴급 backout 요청입니다. 후속 검증 절차를 반드시 수행하세요.');
  }

  // Determine next state
  const nextStatus: BackoutState = needsApproval ? 'pending-approval' : 'ready';

  return {
    nextStatus,
    reason: needsApproval
      ? 'Release branch backout — approval required'
      : 'Validation passed — ready for revert PR generation',
    warnings,
    requiresApproval: needsApproval,
    conflictRisk,
  };
}

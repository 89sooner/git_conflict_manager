import { describe, expect, it } from 'vitest';
import {
  buildConflictGuidance,
  isValidConflictTransition,
} from '../src/jobs/conflictGuidance.js';
import type { ConflictType, ConflictCaseStatus } from '@gsp/shared-types';

describe('buildConflictGuidance', () => {
  const CONFLICT_TYPES: ConflictType[] = [
    'merge',
    'rebase',
    'cherry-pick',
    'modify-delete',
    'rename',
  ];

  it.each(CONFLICT_TYPES)('generates non-empty guidance for type=%s', (type) => {
    const result = buildConflictGuidance(type);
    expect(result.guidance.length).toBeGreaterThan(0);
    expect(result.recoveryActions.length).toBeGreaterThan(0);
    expect(result.interpretedStatus).toBeTruthy();
    expect(result.gitConceptHint).toBeTruthy();
  });

  it('returns unique guidance per conflict type', () => {
    const mergeGuidance = buildConflictGuidance('merge');
    const rebaseGuidance = buildConflictGuidance('rebase');
    expect(mergeGuidance.gitConceptHint).not.toBe(rebaseGuidance.gitConceptHint);
    expect(mergeGuidance.guidance[0]).not.toBe(rebaseGuidance.guidance[0]);
  });
});

describe('isValidConflictTransition', () => {
  const validTransitions: [ConflictCaseStatus, ConflictCaseStatus][] = [
    ['detected', 'analyzing'],
    ['detected', 'aborted'],
    ['detected', 'stale'],
    ['analyzing', 'guided'],
    ['analyzing', 'detected'],
    ['analyzing', 'aborted'],
    ['guided', 'user-working'],
    ['guided', 'stale'],
    ['user-working', 'resolved'],
    ['user-working', 'aborted'],
    ['stale', 'detected'],
  ];

  it.each(validTransitions)('allows %s → %s', (from, to) => {
    expect(isValidConflictTransition(from, to)).toBe(true);
  });

  const invalidTransitions: [ConflictCaseStatus, ConflictCaseStatus][] = [
    ['detected', 'guided'],
    ['detected', 'resolved'],
    ['analyzing', 'resolved'],
    ['guided', 'detected'],
    ['resolved', 'detected'],
    ['resolved', 'analyzing'],
    ['aborted', 'detected'],
    ['stale', 'guided'],
  ];

  it.each(invalidTransitions)('rejects %s → %s', (from, to) => {
    expect(isValidConflictTransition(from, to)).toBe(false);
  });

  it('terminal states have no outgoing transitions', () => {
    const terminalStates: ConflictCaseStatus[] = ['resolved', 'aborted'];
    const allStates: ConflictCaseStatus[] = [
      'detected', 'analyzing', 'guided', 'user-working', 'resolved', 'aborted', 'stale',
    ];
    for (const terminal of terminalStates) {
      for (const target of allStates) {
        expect(isValidConflictTransition(terminal, target)).toBe(false);
      }
    }
  });
});

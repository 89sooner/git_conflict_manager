import { describe, expect, it } from 'vitest';
import {
  CONFLICT_STATUS_BADGES,
  CONFLICT_TYPE_BADGES,
  conflictBadge,
  conflictTypeBadge,
  type ConflictCaseStatus,
  type ConflictType,
  type BadgeTone,
} from '@gsp/shared-types';
import { loadOpenApi } from './openapi-loader';

const ALLOWED_TONES: readonly BadgeTone[] = [
  'neutral',
  'info',
  'success',
  'warning',
  'danger',
  'queue',
];

describe('conflict-status-enum contract', () => {
  it('shared-types ConflictCaseStatus matches openapi.yaml enum', () => {
    const spec = loadOpenApi();
    const schema = spec.components.schemas.ConflictCaseSummary as Record<string, unknown>;
    const props = schema.properties as Record<string, Record<string, unknown>>;
    const schemaStatus = props.status.enum as string[];
    const typesStatuses = Object.keys(CONFLICT_STATUS_BADGES).sort();
    expect(typesStatuses).toEqual([...schemaStatus].sort());
  });
});

describe('conflict-type-enum contract', () => {
  it('shared-types ConflictType matches openapi.yaml enum', () => {
    const spec = loadOpenApi();
    const schema = spec.components.schemas.ConflictCaseSummary as Record<string, unknown>;
    const props = schema.properties as Record<string, Record<string, unknown>>;
    const schemaTypes = props.type.enum as string[];
    const typesTypes = Object.keys(CONFLICT_TYPE_BADGES).sort();
    expect(typesTypes).toEqual([...schemaTypes].sort());
  });
});

describe('conflict badge mapping completeness', () => {
  const CONFLICT_STATUSES: ConflictCaseStatus[] = [
    'detected',
    'analyzing',
    'guided',
    'user-working',
    'resolved',
    'aborted',
    'stale',
  ];

  const CONFLICT_TYPES: ConflictType[] = [
    'merge',
    'rebase',
    'cherry-pick',
    'modify-delete',
    'rename',
  ];

  it('conflictBadge covers all statuses', () => {
    for (const status of CONFLICT_STATUSES) {
      const descriptor = conflictBadge(status);
      expect(descriptor).toBeDefined();
      expect(descriptor.label).toBeTruthy();
      expect(ALLOWED_TONES).toContain(descriptor.tone);
    }
  });

  it('conflictTypeBadge covers all types', () => {
    for (const type of CONFLICT_TYPES) {
      const descriptor = conflictTypeBadge(type);
      expect(descriptor).toBeDefined();
      expect(descriptor.label).toBeTruthy();
      expect(ALLOWED_TONES).toContain(descriptor.tone);
    }
  });
});

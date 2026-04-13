import { describe, it, expect } from 'vitest';
import { BACKOUT_STATES } from '@gsp/shared-types';
import { loadOpenApi } from './openapi-loader.js';

describe('BackoutStatus contract', () => {
  const doc = loadOpenApi();

  it('matches the full state_transition_spec.md state machine', () => {
    const schema = doc.components.schemas.BackoutStatus as { enum: string[] };
    expect(schema.enum).toEqual([...BACKOUT_STATES]);
  });

  it('BackoutSummary.status references BackoutStatus', () => {
    const summary = doc.components.schemas.BackoutSummary as {
      properties: { status: { $ref?: string } };
    };
    expect(summary.properties.status.$ref).toBe('#/components/schemas/BackoutStatus');
  });
});

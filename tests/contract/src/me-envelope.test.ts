import { describe, it, expect } from 'vitest';
import type { UserProfileResponse } from '@gsp/shared-types';
import { loadOpenApi } from './openapi-loader.js';

describe('UserProfileResponse contract', () => {
  const doc = loadOpenApi();
  const schema = doc.components.schemas.UserProfileResponse as {
    properties: {
      data: {
        properties: { user: unknown; permissions: unknown };
      };
      meta: unknown;
    };
  };

  it('exposes data.user, data.permissions and meta', () => {
    expect(schema.properties.data.properties).toHaveProperty('user');
    expect(schema.properties.data.properties).toHaveProperty('permissions');
    expect(schema.properties).toHaveProperty('meta');
  });

  it('accepts a typed fixture shape', () => {
    const fixture: UserProfileResponse = {
      data: {
        user: {
          id: '00000000-0000-0000-0000-000000000000',
          login: 'bootstrap-user',
          displayName: 'Bootstrap User',
          email: null,
        },
        permissions: [],
      },
      meta: {
        requestId: 'req_sample',
      },
    };
    expect(fixture.data.user.login).toBe('bootstrap-user');
  });
});

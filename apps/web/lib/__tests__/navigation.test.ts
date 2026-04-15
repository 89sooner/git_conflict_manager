import { describe, expect, it } from 'vitest';
import { isActiveNavHref } from '../navigation';

describe('isActiveNavHref', () => {
  it('returns false when pathname is null', () => {
    expect(isActiveNavHref(null, '/')).toBe(false);
    expect(isActiveNavHref(null, '/repositories')).toBe(false);
  });

  it('matches the root href only on the root path', () => {
    expect(isActiveNavHref('/', '/')).toBe(true);
    expect(isActiveNavHref('/repositories', '/')).toBe(false);
  });

  it('matches non-root href exactly', () => {
    expect(isActiveNavHref('/repositories', '/repositories')).toBe(true);
  });

  it('matches non-root href as a path-segment prefix', () => {
    expect(isActiveNavHref('/repositories/abc', '/repositories')).toBe(true);
    expect(isActiveNavHref('/pulls/42', '/pulls')).toBe(true);
  });

  it('does not match a sibling route that shares the prefix without a slash boundary', () => {
    expect(isActiveNavHref('/repositories-archive', '/repositories')).toBe(false);
  });
});

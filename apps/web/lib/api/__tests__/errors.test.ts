import { describe, expect, it } from 'vitest';
import { ApiClientError, normalizeError } from '../errors';

describe('normalizeError', () => {
  it('passes ApiClientError fields through (code, message, retryable, userAction)', () => {
    const err = new ApiClientError(
      {
        code: 'REPOSITORY_NOT_FOUND',
        message: 'Repository not found',
        retryable: false,
        userAction: 'GitHub App 설치를 확인하세요.',
      },
      404,
    );
    expect(normalizeError(err)).toEqual({
      code: 'REPOSITORY_NOT_FOUND',
      message: 'Repository not found',
      retryable: false,
      userAction: 'GitHub App 설치를 확인하세요.',
    });
  });

  it('maps native Error to UNKNOWN_ERROR with the original message and retryable=true', () => {
    const result = normalizeError(new Error('boom'));
    expect(result).toEqual({
      code: 'UNKNOWN_ERROR',
      message: 'boom',
      retryable: true,
    });
  });

  it('falls back to a Korean default message when Error.message is empty', () => {
    const result = normalizeError(new Error(''));
    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.message).toBe('알 수 없는 오류가 발생했습니다.');
    expect(result.retryable).toBe(true);
  });

  it('handles non-Error throwables (string, plain object, undefined) without leaking [object Object]', () => {
    for (const value of ['oops', { foo: 'bar' }, undefined, null, 42]) {
      const result = normalizeError(value);
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('알 수 없는 오류가 발생했습니다.');
      expect(result.retryable).toBe(true);
    }
  });
});

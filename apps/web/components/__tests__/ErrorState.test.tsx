// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorState } from '../states/ErrorState';
import { ApiClientError } from '../../lib/api/errors';

describe('ErrorState', () => {
  it('renders the error code and message from ApiClientError', () => {
    const err = new ApiClientError(
      {
        code: 'REPOSITORY_NOT_FOUND',
        message: '저장소를 찾을 수 없습니다.',
        retryable: false,
      },
      404,
    );
    render(<ErrorState error={err} />);

    expect(screen.getByText('저장소를 찾을 수 없습니다.')).toBeInTheDocument();
    expect(screen.getByText(/REPOSITORY_NOT_FOUND/)).toBeInTheDocument();
  });

  it('renders userAction when present', () => {
    const err = new ApiClientError(
      {
        code: 'REPOSITORY_NOT_FOUND',
        message: '오류',
        retryable: false,
        userAction: 'GitHub App을 확인하세요.',
      },
      404,
    );
    render(<ErrorState error={err} />);
    expect(screen.getByText('GitHub App을 확인하세요.')).toBeInTheDocument();
  });

  it('shows retry button when error is retryable and onRetry is provided', () => {
    const onRetry = vi.fn();
    const err = new ApiClientError(
      { code: 'DEPENDENCY_UNAVAILABLE', message: '네트워크 오류', retryable: true },
      0,
    );
    render(<ErrorState error={err} onRetry={onRetry} />);

    const btn = screen.getByRole('button', { name: /다시 시도/ });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides retry button when error is non-retryable even if onRetry provided', () => {
    const err = new ApiClientError(
      { code: 'REPOSITORY_NOT_FOUND', message: '오류', retryable: false },
      404,
    );
    render(<ErrorState error={err} onRetry={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /다시 시도/ })).not.toBeInTheDocument();
  });

  it('handles a plain Error with UNKNOWN_ERROR fallback', () => {
    render(<ErrorState error={new Error('boom')} />);
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.getByText(/UNKNOWN_ERROR/)).toBeInTheDocument();
  });

  it('uses custom title when provided', () => {
    render(<ErrorState error={new Error('x')} title="커스텀 오류 제목" />);
    expect(screen.getByText('커스텀 오류 제목')).toBeInTheDocument();
  });

  it('uses default Korean title when title prop omitted', () => {
    render(<ErrorState error={new Error('x')} />);
    expect(screen.getByText('데이터를 불러오지 못했습니다')).toBeInTheDocument();
  });
});

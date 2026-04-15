// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppShell } from '../AppShell';

// Control pathname per-test
vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/'),
}));

// Render Link as a plain <a> — we only test aria-current/href, not router logic
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}));

// Use real @gsp/config navigation so we test against the actual nav items
import { usePathname } from 'next/navigation';

const mockPathname = vi.mocked(usePathname);

describe('AppShell — navigation active state', () => {
  beforeEach(() => {
    mockPathname.mockReturnValue('/');
  });

  it('marks the root nav link active on "/"', () => {
    render(<AppShell>content</AppShell>);
    const homeLink = screen.getByRole('link', { name: '홈' });
    expect(homeLink).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark non-root links active on "/"', () => {
    render(<AppShell>content</AppShell>);
    const repoLink = screen.getByRole('link', { name: '저장소' });
    expect(repoLink).not.toHaveAttribute('aria-current', 'page');
  });

  it('marks /repositories link active on "/repositories"', () => {
    mockPathname.mockReturnValue('/repositories');
    render(<AppShell>content</AppShell>);
    const repoLink = screen.getByRole('link', { name: '저장소' });
    expect(repoLink).toHaveAttribute('aria-current', 'page');
  });

  it('marks /repositories link active on a deep child route "/repositories/abc"', () => {
    mockPathname.mockReturnValue('/repositories/abc');
    render(<AppShell>content</AppShell>);
    const repoLink = screen.getByRole('link', { name: '저장소' });
    expect(repoLink).toHaveAttribute('aria-current', 'page');
  });
});

describe('AppShell — user display', () => {
  beforeEach(() => {
    mockPathname.mockReturnValue('/');
  });

  it('shows displayName and login when user prop is provided', () => {
    render(
      <AppShell user={{ displayName: 'Bootstrap User', login: 'bootstrap-user' }}>
        content
      </AppShell>,
    );
    expect(screen.getByText(/Bootstrap User/)).toBeInTheDocument();
    expect(screen.getByText(/@bootstrap-user/)).toBeInTheDocument();
  });

  it('shows 미인증 when user prop is null', () => {
    render(<AppShell user={null}>content</AppShell>);
    expect(screen.getByText('미인증')).toBeInTheDocument();
  });

  it('shows 미인증 when user prop is omitted', () => {
    render(<AppShell>content</AppShell>);
    expect(screen.getByText('미인증')).toBeInTheDocument();
  });
});

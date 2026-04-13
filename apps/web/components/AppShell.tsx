import type { CSSProperties, ReactNode } from 'react';
import { appConfig } from '@gsp/config';

export interface AppShellProps {
  children: ReactNode;
}

const layout: CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  gridTemplateRows: 'auto 1fr',
  fontFamily:
    'system-ui, -apple-system, "Segoe UI", Roboto, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
  color: '#0f172a',
  backgroundColor: '#f8fafc',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 24,
  padding: '12px 24px',
  borderBottom: '1px solid #e2e8f0',
  backgroundColor: '#ffffff',
};

const brandStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  letterSpacing: 0.2,
};

const navStyle: CSSProperties = {
  display: 'flex',
  gap: 16,
  fontSize: 14,
};

const navLinkStyle: CSSProperties = {
  color: '#475569',
  textDecoration: 'none',
};

const mainStyle: CSSProperties = {
  padding: 24,
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div style={layout}>
      <header style={headerStyle}>
        <div style={brandStyle} aria-label="app-name">
          {appConfig.appName}
        </div>
        <nav style={navStyle} aria-label="primary">
          {appConfig.navigation.map((item) => (
            <a key={item.key} href={item.href} style={navLinkStyle}>
              {item.label}
            </a>
          ))}
        </nav>
      </header>
      <main style={mainStyle}>{children}</main>
    </div>
  );
}

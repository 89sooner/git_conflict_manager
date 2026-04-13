import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { appConfig } from '@gsp/config';
import { AppShell } from '../components/AppShell';

export const metadata: Metadata = {
  title: appConfig.appName,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0 }}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

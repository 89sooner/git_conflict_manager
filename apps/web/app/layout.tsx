import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { appConfig } from '@gsp/config';
import { AppShell } from '../components/AppShell';

import './globals.css';

export const metadata: Metadata = {
  title: appConfig.appName,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

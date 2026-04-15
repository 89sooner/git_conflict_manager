import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { appConfig } from '@gsp/config';
import { AppShell } from '../components/AppShell';
import { getSession } from '../lib/auth/session';
import { Inter } from 'next/font/google';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: appConfig.appName,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const session = getSession();
  const user = session
    ? { displayName: session.user.displayName, login: session.user.login }
    : null;
  return (
    <html lang="ko" className={inter.className}>
      <body>
        <AppShell user={user}>{children}</AppShell>
      </body>
    </html>
  );
}

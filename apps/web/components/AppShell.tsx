'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { appConfig } from '@gsp/config';
import { GitMerge } from 'lucide-react';
import { cn } from '../lib/utils';
import { isActiveNavHref } from '../lib/navigation';

export interface AppShellUser {
  displayName: string;
  login: string;
}

export interface AppShellProps {
  children: ReactNode;
  user?: AppShellUser | null;
}

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5 font-semibold text-foreground tracking-tight">
            <div className="flex h-7 w-7 items-center justify-center rounded overflow-hidden bg-foreground text-background shadow-sm">
              <GitMerge className="h-4 w-4" />
            </div>
            <span>{appConfig.appName}</span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium" aria-label="primary">
            {appConfig.navigation.map((item) => {
              const active = isActiveNavHref(pathname, item.href);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'transition-colors hover:text-foreground',
                    active ? 'text-foreground font-medium' : 'text-muted-foreground',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <span className="hidden sm:inline text-xs text-muted-foreground">
              {user.displayName}{' '}
              <span className="text-muted-foreground/60">@{user.login}</span>
            </span>
          ) : (
            <span className="hidden sm:inline text-xs text-amber-500">미인증</span>
          )}
          <div className="h-8 w-8 rounded-full bg-secondary border border-border"></div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-6xl mx-auto p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}

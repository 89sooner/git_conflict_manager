import type { ReactNode } from 'react';
import { appConfig } from '@gsp/config';
import { GitMerge } from 'lucide-react';

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white">
              <GitMerge className="h-5 w-5" />
            </div>
            <span>{appConfig.appName}</span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium" aria-label="primary">
            {appConfig.navigation.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className="text-slate-600 transition-colors hover:text-slate-900"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-slate-200 border border-slate-300"></div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-6xl mx-auto p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}

import type { ReactNode } from 'react';

export const metadata = {
  title: 'Git Support Platform'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ fontFamily: 'sans-serif', margin: 0 }}>
        {children}
      </body>
    </html>
  );
}

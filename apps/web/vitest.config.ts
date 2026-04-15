import { defineConfig } from 'vitest/config';

export default defineConfig({
  // tsconfig.json has "jsx": "preserve" for Next.js, but esbuild (used by
  // vitest) must be told to use the React 17+ automatic runtime explicitly.
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    globals: true,
    environmentMatchGlobs: [
      ['components/**', 'jsdom'],
      ['app/**', 'jsdom'],
    ],
    setupFiles: ['./test/setup.ts'],
    include: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
  },
});

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
  esbuild: {
    // Nest relies on decorator metadata; keep esbuild in step with tsconfig.
    target: 'es2022',
  },
})

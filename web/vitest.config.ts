import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
  },
  plugins: [tsconfigPaths()],
  resolve: {
    alias: [
      { find: /^@\//, replacement: path.resolve(__dirname) + '/' },
    ],
  },
})

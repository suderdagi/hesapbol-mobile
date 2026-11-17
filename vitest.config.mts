import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Only the pure TypeScript logic (money, splitting, balances, reducer) is unit tested here
export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname) } },
  test: { include: ['src/**/*.test.ts'] },
})

/**
 * Vitest 根配置
 * 各子系统可在自己的目录下创建 vitest.config.js 覆盖此配置
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.js', '**/*.spec.js'],
    exclude: ['**/node_modules/**', '**/dist/**', '.snapshots/**', '**/client/**', '**/mobile/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['**/src/**/*.js'],
      exclude: ['node_modules/**', 'dist/**', '**/*.test.js', '**/*.spec.js', '**/prisma/**'],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    sequence: {
      concurrent: false,
    },
  },
});

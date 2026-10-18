import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', setupFiles: ['./src/test/integration/setup.ts'], include: ['src/test/integration/**/*.test.ts'], testTimeout: 30000, hookTimeout: 30000, fileParallelism: false } });

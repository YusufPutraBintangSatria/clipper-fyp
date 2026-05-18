import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    sequence: {
      concurrent: false,
    },
    env: {
      DATABASE_URL: 'file:test.db',
      YOUTUBE_CLIENT_ID: 'test-youtube-client-id',
      YOUTUBE_CLIENT_SECRET: 'test-youtube-client-secret',
      TIKTOK_CLIENT_KEY: 'test-tiktok-client-key',
      TIKTOK_CLIENT_SECRET: 'test-tiktok-client-secret',
      GEMINI_API_KEY: 'test-gemini-api-key',
    }
  },
});

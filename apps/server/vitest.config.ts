import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./test/globalSetup.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test.db',
      JWT_ACCESS_SECRET: 'test-secret-test-secret-test-secret-1234567890',
      ENCRYPTION_KEY: '0000000000000000000000000000000000000000000000000000000000000001',
      APP_URL: 'http://localhost:5173',
      LLM_PROVIDER: 'none',
      OPENAI_API_KEY: '',
      GEMINI_API_KEY: '',
      ANTHROPIC_API_KEY: '',
      SERVE_WEB: 'false',
      LOG_LEVEL: 'silent',
    },
  },
});

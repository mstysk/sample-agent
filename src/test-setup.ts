import { vi } from 'vitest';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Global test setup
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
  
  // Set default environment variables for tests
  process.env.LLM_PROVIDER = 'ollama';
  process.env.STORAGE_TYPE = 'libsql';
  process.env.LIBSQL_URL = 'file::memory:?cache=shared';
  process.env.GITHUB_REPOSITORY = 'https://github.com/test/repo';
  process.env.HELP_DOCS_URL = 'https://docs.test.com';
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '3306';
  process.env.DB_NAME = 'test_db';
  process.env.DB_USERNAME = 'testuser';
  process.env.DB_PASSWORD = 'testpass';
});

// Global test cleanup
afterEach(() => {
  vi.restoreAllMocks();
});
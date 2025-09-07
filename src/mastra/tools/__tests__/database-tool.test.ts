import { describe, it, expect, vi, beforeEach } from 'vitest';
import { databaseConnectionTool, formatDatabaseResults } from '../database-tool';

// Mock the environment config
vi.mock('../../types/environment', () => ({
  loadEnvironmentConfig: vi.fn(() => ({
    databaseConnection: {
      host: 'localhost',
      port: 3306,
      database: 'test_db',
      username: 'testuser',
      password: 'testpass',
    },
    githubRepository: 'https://github.com/test/repo',
    helpDocsUrl: 'https://docs.test.com',
    llmProvider: 'ollama',
    storageType: 'libsql',
  })),
}));

describe('databaseConnectionTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('status action', () => {
    it('should check database connection status', async () => {
      const context = {
        action: 'status' as const,
      };

      const result = await databaseConnectionTool.execute({ context });

      expect(result.action).toBe('status');
      expect(result.result).toHaveProperty('status');
      expect(result.result).toHaveProperty('host');
      expect(result.result).toHaveProperty('database');
      expect(['connected', 'disconnected']).toContain(result.result.status);
    });
  });

  describe('tables action', () => {
    it('should list database tables', async () => {
      const context = {
        action: 'tables' as const,
      };

      const result = await databaseConnectionTool.execute({ context });

      expect(result.action).toBe('tables');
      expect(result.result).toHaveProperty('tables');
      expect(result.result).toHaveProperty('totalTables');
      expect(Array.isArray(result.result.tables)).toBe(true);
      expect(typeof result.result.totalTables).toBe('number');
    });
  });

  describe('query action', () => {
    it('should execute safe SELECT query', async () => {
      const context = {
        action: 'query' as const,
        query: 'SELECT * FROM users LIMIT 10',
      };

      const result = await databaseConnectionTool.execute({ context });

      expect(result.action).toBe('query');
      if (result.success) {
        expect(result.result).toHaveProperty('query');
        expect(result.result).toHaveProperty('rows');
        expect(result.result).toHaveProperty('executionTime');
        expect(result.result).toHaveProperty('rowCount');
      }
    });

    it('should reject dangerous queries', async () => {
      const dangerousQueries = [
        'DROP TABLE users',
        'DELETE FROM users',
        'TRUNCATE TABLE users',
        'ALTER TABLE users ADD COLUMN test VARCHAR(50)',
      ];

      for (const query of dangerousQueries) {
        const context = {
          action: 'query' as const,
          query,
        };

        const result = await databaseConnectionTool.execute({ context });

        expect(result.success).toBe(false);
        expect(result.message).toContain('dangerous operations');
      }
    });

    it('should require query parameter for query action', async () => {
      const context = {
        action: 'query' as const,
      };

      const result = await databaseConnectionTool.execute({ context });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Query parameter is required');
    });
  });

  describe('diagnostics action', () => {
    it('should run general diagnostics', async () => {
      const context = {
        action: 'diagnostics' as const,
      };

      const result = await databaseConnectionTool.execute({ context });

      expect(result.action).toBe('diagnostics');
      if (result.success) {
        expect(result.result).toHaveProperty('connectionPool');
        expect(result.result).toHaveProperty('performance');
        expect(result.result).toHaveProperty('storage');
      }
    });

    it('should run table-specific diagnostics', async () => {
      const context = {
        action: 'diagnostics' as const,
        table: 'users',
      };

      const result = await databaseConnectionTool.execute({ context });

      expect(result.action).toBe('diagnostics');
      if (result.success) {
        expect(result.result).toHaveProperty('tableSpecific');
        expect(result.result.tableSpecific.table).toBe('users');
      }
    });
  });

  describe('error handling', () => {
    it('should handle invalid action', async () => {
      const context = {
        action: 'invalid' as any,
      };

      const result = await databaseConnectionTool.execute({ context });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid action');
      expect(result.suggestions).toContain('Use one of: status, tables, query, diagnostics');
    });
  });

  describe('tool schema validation', () => {
    it('should validate input schema', () => {
      const inputSchema = databaseConnectionTool.inputSchema;
      
      const validInputs = [
        { action: 'status' },
        { action: 'tables' },
        { action: 'query', query: 'SELECT * FROM users' },
        { action: 'diagnostics', table: 'users' },
      ];

      validInputs.forEach(input => {
        const result = inputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid actions', () => {
      const inputSchema = databaseConnectionTool.inputSchema;
      
      const invalidInput = {
        action: 'invalid-action',
      };

      const result = inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have correct output schema', () => {
      const outputSchema = databaseConnectionTool.outputSchema;
      
      const validOutput = {
        success: true,
        action: 'status',
        result: { status: 'connected' },
        message: 'Connection successful',
        suggestions: [],
      };

      const result = outputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });
  });
});

describe('formatDatabaseResults', () => {
  it('should format successful status result', () => {
    const result = {
      success: true,
      action: 'status',
      result: {
        status: 'connected',
        host: 'localhost',
        database: 'test_db',
        connectionTime: '45ms',
      },
      message: 'Connected',
      suggestions: [],
    };

    const formatted = formatDatabaseResults(result);

    expect(formatted).toContain('✅');
    expect(formatted).toContain('CONNECTED');
    expect(formatted).toContain('localhost');
    expect(formatted).toContain('test_db');
    expect(formatted).toContain('45ms');
  });

  it('should format error result', () => {
    const result = {
      success: false,
      action: 'status',
      result: null,
      message: 'Connection failed',
      suggestions: ['Check configuration', 'Verify credentials'],
    };

    const formatted = formatDatabaseResults(result);

    expect(formatted).toContain('❌');
    expect(formatted).toContain('Connection failed');
    expect(formatted).toContain('Check configuration');
    expect(formatted).toContain('Verify credentials');
  });

  it('should format tables result', () => {
    const result = {
      success: true,
      action: 'tables',
      result: {
        tables: [
          { name: 'users', rows: 100, size: '1MB' },
          { name: 'products', rows: 50, size: '500KB' },
        ],
        totalTables: 2,
      },
      message: 'Tables listed',
      suggestions: [],
    };

    const formatted = formatDatabaseResults(result);

    expect(formatted).toContain('📊');
    expect(formatted).toContain('users');
    expect(formatted).toContain('products');
    expect(formatted).toContain('100 rows');
    expect(formatted).toContain('1MB');
  });

  it('should format query result', () => {
    const result = {
      success: true,
      action: 'query',
      result: {
        rows: [{ id: 1, name: 'Test' }],
        rowCount: 1,
        executionTime: '123ms',
      },
      message: 'Query executed',
      suggestions: [],
    };

    const formatted = formatDatabaseResults(result);

    expect(formatted).toContain('🔍');
    expect(formatted).toContain('1');
    expect(formatted).toContain('123ms');
    expect(formatted).toContain('```json');
  });

  it('should format diagnostics result', () => {
    const result = {
      success: true,
      action: 'diagnostics',
      result: {
        connectionPool: { active: 5, idle: 10, total: 15 },
        performance: { avgResponseTime: '50ms', slowQueries: 2 },
        storage: { usage: '60%', totalSize: '100GB' },
      },
      message: 'Diagnostics completed',
      suggestions: [],
    };

    const formatted = formatDatabaseResults(result);

    expect(formatted).toContain('🔧');
    expect(formatted).toContain('Active: 5');
    expect(formatted).toContain('50ms');
    expect(formatted).toContain('60%');
  });
});
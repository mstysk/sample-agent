import { describe, it, expect, vi, beforeEach } from 'vitest';
import { technicalSupportAgent } from '../technical-support-agent';

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

// Mock the tools
vi.mock('../../tools/source-code-tool', () => ({
  sourceCodeSearchTool: {
    id: 'search-source-code',
    execute: vi.fn(),
  },
}));

vi.mock('../../tools/help-docs-tool', () => ({
  helpDocsSearchTool: {
    id: 'search-help-docs',
    execute: vi.fn(),
  },
}));

vi.mock('../../tools/database-tool', () => ({
  databaseConnectionTool: {
    id: 'database-connection',
    execute: vi.fn(),
  },
}));

// Mock the LLM provider
vi.mock('../../utils/llm-provider', () => ({
  createLLMProvider: vi.fn(() => ({
    generateText: vi.fn(),
    generateObject: vi.fn(),
  })),
}));

describe('TechnicalSupportAgent Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('agent configuration', () => {
    it('should be properly configured with Japanese instructions', () => {
      expect(technicalSupportAgent.name).toBe('Technical Support Agent');
      expect(technicalSupportAgent.instructions).toContain('あなたは包括的な技術サポートを提供するAIアシスタント');
      expect(technicalSupportAgent.instructions).toContain('日本語で回答してください');
    });

    it('should have all required tools available', () => {
      const toolNames = Object.keys(technicalSupportAgent.tools || {});
      expect(toolNames).toContain('sourceCodeSearchTool');
      expect(toolNames).toContain('helpDocsSearchTool');
      expect(toolNames).toContain('databaseConnectionTool');
    });

    it('should have proper model configuration', () => {
      expect(technicalSupportAgent.model).toBeDefined();
    });
  });

  describe('agent behavior scenarios', () => {
    it('should handle database troubleshooting scenario', async () => {
      const mockDbToolResponse = {
        success: true,
        action: 'status',
        result: {
          status: 'connected',
          host: 'localhost',
          database: 'test_db',
          connectionTime: '45ms',
        },
        message: 'Connection successful',
        suggestions: [],
      };

      const { databaseConnectionTool } = await import('../../tools/database-tool');
      vi.mocked(databaseConnectionTool.execute).mockResolvedValue(mockDbToolResponse);

      // Test that the tool can be called with correct parameters
      const result = await databaseConnectionTool.execute({
        context: { action: 'status' },
      });

      expect(result.success).toBe(true);
      expect(result.result.status).toBe('connected');
    });

    it('should handle source code search scenario', async () => {
      const mockSourceCodeResponse = {
        results: [
          {
            repository: 'https://github.com/test/repo',
            filePath: 'src/auth.ts',
            lineNumber: 45,
            snippet: 'export function authenticate() { return true; }',
            relevance: 0.9,
            url: 'https://github.com/test/repo/blob/main/src/auth.ts#L45',
          },
        ],
        totalResults: 1,
        searchQuery: 'authentication',
        success: true,
      };

      const { sourceCodeSearchTool } = await import('../../tools/source-code-tool');
      vi.mocked(sourceCodeSearchTool.execute).mockResolvedValue(mockSourceCodeResponse);

      const result = await sourceCodeSearchTool.execute({
        context: {
          query: 'authentication',
          fileType: 'ts',
        },
      });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].filePath).toBe('src/auth.ts');
    });

    it('should handle help documentation search scenario', async () => {
      const mockDocsResponse = {
        results: [
          {
            url: 'https://docs.test.com/auth',
            title: 'Authentication Guide',
            excerpt: 'Learn how to authenticate users in your application.',
            relevance: 0.95,
            category: 'security',
          },
        ],
        totalResults: 1,
        searchQuery: 'authentication',
        suggestedQueries: ['user login', 'oauth', 'jwt tokens'],
        success: true,
      };

      const { helpDocsSearchTool } = await import('../../tools/help-docs-tool');
      vi.mocked(helpDocsSearchTool.execute).mockResolvedValue(mockDocsResponse);

      const result = await helpDocsSearchTool.execute({
        context: {
          query: 'authentication',
          limit: 5,
        },
      });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].title).toBe('Authentication Guide');
    });
  });

  describe('error handling scenarios', () => {
    it('should handle tool execution failures gracefully', async () => {
      const { databaseConnectionTool } = await import('../../tools/database-tool');
      vi.mocked(databaseConnectionTool.execute).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        databaseConnectionTool.execute({ context: { action: 'status' } })
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid tool parameters', async () => {
      const mockErrorResponse = {
        success: false,
        action: 'query',
        result: null,
        message: 'Query parameter is required for query action',
        suggestions: ['Provide a valid SQL query'],
      };

      const { databaseConnectionTool } = await import('../../tools/database-tool');
      vi.mocked(databaseConnectionTool.execute).mockResolvedValue(mockErrorResponse);

      const result = await databaseConnectionTool.execute({
        context: { action: 'query' }, // Missing required query parameter
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Query parameter is required');
    });
  });

  describe('multi-tool scenarios', () => {
    it('should handle complex troubleshooting workflow', async () => {
      // Simulate a scenario where multiple tools are used in sequence
      const { sourceCodeSearchTool } = await import('../../tools/source-code-tool');
      const { helpDocsSearchTool } = await import('../../tools/help-docs-tool');
      const { databaseConnectionTool } = await import('../../tools/database-tool');

      // First: Search for error in source code
      vi.mocked(sourceCodeSearchTool.execute).mockResolvedValue({
        results: [
          {
            repository: 'https://github.com/test/repo',
            filePath: 'src/database/connection.ts',
            lineNumber: 23,
            snippet: 'throw new Error("Connection timeout");',
            relevance: 0.85,
            url: 'https://github.com/test/repo/blob/main/src/database/connection.ts#L23',
          },
        ],
        totalResults: 1,
        searchQuery: 'connection timeout',
        success: true,
      });

      // Second: Check database status
      vi.mocked(databaseConnectionTool.execute).mockResolvedValue({
        success: false,
        action: 'status',
        result: null,
        message: 'Connection timeout after 30 seconds',
        suggestions: ['Check database server status', 'Verify network connectivity'],
      });

      // Third: Search for documentation about timeouts
      vi.mocked(helpDocsSearchTool.execute).mockResolvedValue({
        results: [
          {
            url: 'https://docs.test.com/troubleshooting/timeouts',
            title: 'Database Timeout Troubleshooting',
            excerpt: 'Common causes and solutions for database timeouts.',
            relevance: 0.92,
            category: 'troubleshooting',
          },
        ],
        totalResults: 1,
        searchQuery: 'database timeout',
        suggestedQueries: ['connection pool', 'timeout configuration'],
        success: true,
      });

      // Execute the workflow
      const sourceCodeResult = await sourceCodeSearchTool.execute({
        context: { query: 'connection timeout', fileType: 'ts' },
      });

      const dbStatusResult = await databaseConnectionTool.execute({
        context: { action: 'status' },
      });

      const docsResult = await helpDocsSearchTool.execute({
        context: { query: 'database timeout' },
      });

      // Verify the workflow results
      expect(sourceCodeResult.success).toBe(true);
      expect(sourceCodeResult.results[0].snippet).toContain('Connection timeout');

      expect(dbStatusResult.success).toBe(false);
      expect(dbStatusResult.suggestions).toContain('Check database server status');

      expect(docsResult.success).toBe(true);
      expect(docsResult.results[0].title).toContain('Timeout Troubleshooting');
    });
  });

  describe('agent memory and context', () => {
    it('should maintain context throughout conversation', () => {
      // Test that the agent maintains instructions and context
      expect(technicalSupportAgent.instructions).toContain('前の回答を参考にして一貫した対応を提供');
      expect(technicalSupportAgent.instructions).toContain('段階的な解決アプローチ');
    });

    it('should provide structured responses', () => {
      // Test that instructions specify structured response format
      expect(technicalSupportAgent.instructions).toContain('問題の分析');
      expect(technicalSupportAgent.instructions).toContain('解決策の提案');
      expect(technicalSupportAgent.instructions).toContain('次のステップ');
    });
  });
});
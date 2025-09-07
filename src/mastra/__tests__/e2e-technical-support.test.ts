import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Mastra } from '@mastra/core';
import { technicalSupportAgent } from '../agents/technical-support-agent';
import { loadEnvironmentConfig } from '../types/environment';

// Mock external dependencies for E2E tests
vi.mock('../types/environment');
vi.mock('../utils/llm-provider');
vi.mock('../tools/source-code-tool');
vi.mock('../tools/help-docs-tool');
vi.mock('../tools/database-tool');

describe('Technical Support Agent E2E Tests', () => {
  let mastra: Mastra;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock environment configuration
    const mockConfig = {
      databaseConnection: {
        host: 'localhost',
        port: 3306,
        database: 'test_db',
        username: 'testuser',
        password: 'testpass',
      },
      githubRepository: 'https://github.com/test/repo',
      helpDocsUrl: 'https://docs.test.com',
      llmProvider: 'ollama' as const,
      storageType: 'libsql' as const,
    };

    vi.mocked(loadEnvironmentConfig).mockReturnValue(mockConfig);

    // Initialize Mastra with test configuration
    mastra = new Mastra({
      agents: [technicalSupportAgent],
    });
  });

  describe('Full Support Workflow Scenarios', () => {
    it('should handle complete troubleshooting session', async () => {
      // Mock successful tool responses
      const { sourceCodeSearchTool } = await import('../tools/source-code-tool');
      const { helpDocsSearchTool } = await import('../tools/help-docs-tool');
      const { databaseConnectionTool } = await import('../tools/database-tool');

      // Scenario: User reports database connection issues
      vi.mocked(databaseConnectionTool.execute).mockResolvedValue({
        success: false,
        action: 'status',
        result: null,
        message: 'Connection failed: timeout after 30 seconds',
        suggestions: [
          'Check if database server is running',
          'Verify connection parameters',
          'Check network connectivity',
        ],
      });

      vi.mocked(sourceCodeSearchTool.execute).mockResolvedValue({
        results: [
          {
            repository: 'https://github.com/test/repo',
            filePath: 'src/config/database.ts',
            lineNumber: 15,
            snippet: 'timeout: 30000, // 30 seconds',
            relevance: 0.9,
            url: 'https://github.com/test/repo/blob/main/src/config/database.ts#L15',
          },
        ],
        totalResults: 1,
        searchQuery: 'database timeout configuration',
        success: true,
      });

      vi.mocked(helpDocsSearchTool.execute).mockResolvedValue({
        results: [
          {
            url: 'https://docs.test.com/database/connection-issues',
            title: 'Database Connection Troubleshooting',
            excerpt: 'Common database connection issues and how to resolve them.',
            relevance: 0.95,
            category: 'troubleshooting',
          },
        ],
        totalResults: 1,
        searchQuery: 'database connection troubleshooting',
        suggestedQueries: [
          'timeout configuration',
          'connection pool settings',
          'database server health',
        ],
        success: true,
      });

      // Test the workflow
      const dbStatusResult = await databaseConnectionTool.execute({
        context: { action: 'status' },
      });
      
      expect(dbStatusResult.success).toBe(false);
      expect(dbStatusResult.suggestions).toContain('Check if database server is running');

      const sourceCodeResult = await sourceCodeSearchTool.execute({
        context: { query: 'database timeout configuration' },
      });
      
      expect(sourceCodeResult.success).toBe(true);
      expect(sourceCodeResult.results[0].snippet).toContain('timeout: 30000');

      const docsResult = await helpDocsSearchTool.execute({
        context: { query: 'database connection troubleshooting' },
      });
      
      expect(docsResult.success).toBe(true);
      expect(docsResult.results[0].title).toContain('Troubleshooting');
    });

    it('should handle performance analysis workflow', async () => {
      const { databaseConnectionTool } = await import('../tools/database-tool');
      const { sourceCodeSearchTool } = await import('../tools/source-code-tool');

      // Scenario: User reports slow application performance
      vi.mocked(databaseConnectionTool.execute).mockResolvedValue({
        success: true,
        action: 'diagnostics',
        result: {
          connectionPool: {
            active: 8,
            idle: 2,
            total: 10,
          },
          performance: {
            avgResponseTime: '250ms',
            slowQueries: 5,
          },
          storage: {
            usage: '85%',
            totalSize: '10GB',
          },
        },
        message: 'Database diagnostics completed',
        suggestions: [
          'Consider increasing connection pool size',
          'Review slow queries for optimization',
          'Monitor storage usage',
        ],
      });

      vi.mocked(sourceCodeSearchTool.execute).mockResolvedValue({
        results: [
          {
            repository: 'https://github.com/test/repo',
            filePath: 'src/database/queries.ts',
            lineNumber: 42,
            snippet: 'SELECT * FROM large_table WHERE created_at > ?',
            relevance: 0.8,
            url: 'https://github.com/test/repo/blob/main/src/database/queries.ts#L42',
          },
        ],
        totalResults: 1,
        searchQuery: 'slow database queries',
        success: true,
      });

      // Test performance analysis workflow
      const diagnosticsResult = await databaseConnectionTool.execute({
        context: { action: 'diagnostics' },
      });

      expect(diagnosticsResult.success).toBe(true);
      expect(diagnosticsResult.result.performance.slowQueries).toBe(5);
      expect(diagnosticsResult.suggestions).toContain('Review slow queries for optimization');

      const slowQueryResult = await sourceCodeSearchTool.execute({
        context: { query: 'slow database queries', fileType: 'ts' },
      });

      expect(slowQueryResult.success).toBe(true);
      expect(slowQueryResult.results[0].filePath).toContain('queries.ts');
    });

    it('should handle API documentation search workflow', async () => {
      const { helpDocsSearchTool } = await import('../tools/help-docs-tool');
      const { sourceCodeSearchTool } = await import('../tools/source-code-tool');

      // Scenario: User needs help with API implementation
      vi.mocked(helpDocsSearchTool.execute).mockResolvedValue({
        results: [
          {
            url: 'https://docs.test.com/api/authentication',
            title: 'Authentication API Reference',
            excerpt: 'Complete guide to authentication endpoints and usage.',
            relevance: 0.92,
            category: 'api',
          },
          {
            url: 'https://docs.test.com/api/examples',
            title: 'API Usage Examples',
            excerpt: 'Practical examples of API integration.',
            relevance: 0.88,
            category: 'examples',
          },
        ],
        totalResults: 2,
        searchQuery: 'authentication api',
        suggestedQueries: ['oauth flow', 'jwt tokens', 'api keys'],
        success: true,
      });

      vi.mocked(sourceCodeSearchTool.execute).mockResolvedValue({
        results: [
          {
            repository: 'https://github.com/test/repo',
            filePath: 'src/api/auth.ts',
            lineNumber: 25,
            snippet: 'export async function authenticateUser(token: string)',
            relevance: 0.9,
            url: 'https://github.com/test/repo/blob/main/src/api/auth.ts#L25',
          },
        ],
        totalResults: 1,
        searchQuery: 'authentication implementation',
        success: true,
      });

      // Test API documentation workflow
      const docsResult = await helpDocsSearchTool.execute({
        context: { query: 'authentication api', category: 'api' },
      });

      expect(docsResult.success).toBe(true);
      expect(docsResult.results).toHaveLength(2);
      expect(docsResult.results[0].category).toBe('api');

      const implementationResult = await sourceCodeSearchTool.execute({
        context: { query: 'authentication implementation', fileType: 'ts' },
      });

      expect(implementationResult.success).toBe(true);
      expect(implementationResult.results[0].snippet).toContain('authenticateUser');
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle tool failures gracefully', async () => {
      const { databaseConnectionTool } = await import('../tools/database-tool');
      const { helpDocsSearchTool } = await import('../tools/help-docs-tool');

      // Scenario: Database tool fails, fallback to documentation
      vi.mocked(databaseConnectionTool.execute).mockRejectedValue(
        new Error('Database connection refused')
      );

      vi.mocked(helpDocsSearchTool.execute).mockResolvedValue({
        results: [
          {
            url: 'https://docs.test.com/troubleshooting/database',
            title: 'Database Connection Issues',
            excerpt: 'What to do when database connections fail.',
            relevance: 0.9,
            category: 'troubleshooting',
          },
        ],
        totalResults: 1,
        searchQuery: 'database connection failed',
        suggestedQueries: ['server restart', 'configuration check'],
        success: true,
      });

      // Test error recovery
      await expect(
        databaseConnectionTool.execute({ context: { action: 'status' } })
      ).rejects.toThrow('Database connection refused');

      // Fallback to documentation should still work
      const fallbackResult = await helpDocsSearchTool.execute({
        context: { query: 'database connection failed' },
      });

      expect(fallbackResult.success).toBe(true);
      expect(fallbackResult.results[0].title).toContain('Database Connection Issues');
    });

    it('should handle partial tool responses', async () => {
      const { sourceCodeSearchTool } = await import('../tools/source-code-tool');

      // Scenario: Empty search results should be handled gracefully
      vi.mocked(sourceCodeSearchTool.execute).mockResolvedValue({
        results: [],
        totalResults: 0,
        searchQuery: 'nonexistent-function',
        success: true,
      });

      const emptyResult = await sourceCodeSearchTool.execute({
        context: { query: 'nonexistent-function' },
      });

      expect(emptyResult.success).toBe(true);
      expect(emptyResult.results).toHaveLength(0);
      expect(emptyResult.totalResults).toBe(0);
    });
  });

  describe('Agent Integration', () => {
    it('should properly initialize with all tools', () => {
      expect(technicalSupportAgent).toBeDefined();
      expect(technicalSupportAgent.name).toBe('Technical Support Agent');
      expect(technicalSupportAgent.tools).toBeDefined();
      
      const toolNames = Object.keys(technicalSupportAgent.tools || {});
      expect(toolNames).toContain('sourceCodeSearchTool');
      expect(toolNames).toContain('helpDocsSearchTool');
      expect(toolNames).toContain('databaseConnectionTool');
    });

    it('should have proper Japanese instructions', () => {
      expect(technicalSupportAgent.instructions).toContain('日本語で回答してください');
      expect(technicalSupportAgent.instructions).toContain('技術サポート');
      expect(technicalSupportAgent.instructions).toContain('段階的な解決アプローチ');
    });
  });
});
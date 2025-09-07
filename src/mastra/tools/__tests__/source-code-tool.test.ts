import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sourceCodeSearchTool, formatSourceCodeResults } from '../source-code-tool';

// Mock the environment config
vi.mock('../../types/environment', () => ({
  loadEnvironmentConfig: vi.fn(() => ({
    githubRepository: 'https://github.com/test/repo',
    llmProvider: 'ollama',
    storageType: 'libsql',
    helpDocsUrl: 'https://docs.test.com',
    databaseConnection: {},
  })),
}));

describe('sourceCodeSearchTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tool execution', () => {
    it('should return search results for valid query', async () => {
      const context = {
        query: 'authentication',
        fileType: 'ts',
      };

      const result = await sourceCodeSearchTool.execute({ context });

      expect(result.success).toBe(true);
      expect(result.searchQuery).toBe('authentication');
      expect(result.totalResults).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should filter results by file type', async () => {
      const context = {
        query: 'component',
        fileType: 'ts',
      };

      const result = await sourceCodeSearchTool.execute({ context });

      // All results should have .ts extension if any results are returned
      if (result.results.length > 0) {
        result.results.forEach(item => {
          expect(item.filePath).toMatch(/\.ts$/);
        });
      }
    });

    it('should filter results by path', async () => {
      const context = {
        query: 'component',
        path: 'src/components',
      };

      const result = await sourceCodeSearchTool.execute({ context });

      // All results should start with specified path if any results are returned
      if (result.results.length > 0) {
        result.results.forEach(item => {
          expect(item.filePath).toMatch(/^src\/components/);
        });
      }
    });

    it('should handle empty query gracefully', async () => {
      const context = {
        query: '',
      };

      const result = await sourceCodeSearchTool.execute({ context });

      expect(result.success).toBe(true);
      expect(result.searchQuery).toBe('');
      expect(result.totalResults).toBe(0);
      expect(result.results).toEqual([]);
    });

    it('should handle queries with no matches', async () => {
      const context = {
        query: 'nonexistent-very-specific-query-12345',
      };

      const result = await sourceCodeSearchTool.execute({ context });

      expect(result.success).toBe(true);
      expect(result.totalResults).toBe(0);
      expect(result.results).toEqual([]);
    });
  });

  describe('tool schema validation', () => {
    it('should have correct input schema', () => {
      const inputSchema = sourceCodeSearchTool.inputSchema;
      
      // Test valid input
      const validInput = {
        query: 'test',
        fileType: 'ts',
        path: 'src/components',
      };

      const result = inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate required query field', () => {
      const inputSchema = sourceCodeSearchTool.inputSchema;
      
      // Test missing required field
      const invalidInput = {
        fileType: 'ts',
      };

      const result = inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should have correct output schema', () => {
      const outputSchema = sourceCodeSearchTool.outputSchema;
      
      const validOutput = {
        results: [
          {
            repository: 'https://github.com/test/repo',
            filePath: 'src/test.ts',
            lineNumber: 10,
            snippet: 'test code',
            relevance: 0.8,
            url: 'https://github.com/test/repo/blob/main/src/test.ts#L10',
          }
        ],
        totalResults: 1,
        searchQuery: 'test',
      };

      const result = outputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });
  });
});

describe('formatSourceCodeResults', () => {
  it('should format results correctly', () => {
    const results = [
      {
        repository: 'https://github.com/test/repo',
        filePath: 'src/auth.ts',
        lineNumber: 45,
        snippet: 'export function authenticate() { return true; }',
        relevance: 0.9,
      }
    ];

    const formatted = formatSourceCodeResults(results);

    expect(formatted).toContain('src/auth.ts');
    expect(formatted).toContain('line 45');
    expect(formatted).toContain('90%');
    expect(formatted).toContain('typescript');
    expect(formatted).toContain('export function authenticate()');
  });

  it('should handle empty results', () => {
    const formatted = formatSourceCodeResults([]);
    
    expect(formatted).toContain('No source code found');
  });

  it('should format results without line numbers', () => {
    const results = [
      {
        repository: 'https://github.com/test/repo',
        filePath: 'src/utils.ts',
        snippet: 'export const helper = () => {}',
        relevance: 0.7,
      }
    ];

    const formatted = formatSourceCodeResults(results);

    expect(formatted).toContain('src/utils.ts');
    expect(formatted).not.toContain('line');
    expect(formatted).toContain('70%');
  });
});
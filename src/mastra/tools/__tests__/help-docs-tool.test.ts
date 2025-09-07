import { describe, it, expect, vi, beforeEach } from 'vitest';
import { helpDocsSearchTool, formatHelpDocsResults } from '../help-docs-tool';

// Mock the environment config
vi.mock('../../types/environment', () => ({
  loadEnvironmentConfig: vi.fn(() => ({
    helpDocsUrl: 'https://docs.test.com',
    githubRepository: 'https://github.com/test/repo',
    llmProvider: 'ollama',
    storageType: 'libsql',
    databaseConnection: {},
  })),
}));

describe('helpDocsSearchTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tool execution', () => {
    it('should return search results for valid query', async () => {
      const context = {
        query: 'authentication',
        limit: 5,
      };

      const result = await helpDocsSearchTool.execute({ context });

      expect(result.success).toBe(true);
      expect(result.searchQuery).toBe('authentication');
      expect(result.totalResults).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.results)).toBe(true);
      expect(Array.isArray(result.suggestedQueries)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const context = {
        query: 'api',
        limit: 2,
      };

      const result = await helpDocsSearchTool.execute({ context });

      expect(result.results.length).toBeLessThanOrEqual(2);
    });

    it('should filter by category when provided', async () => {
      const context = {
        query: 'authentication',
        category: 'api',
      };

      const result = await helpDocsSearchTool.execute({ context });

      if (result.results.length > 0) {
        result.results.forEach(item => {
          expect(
            item.url.toLowerCase().includes('api') ||
            item.title.toLowerCase().includes('api')
          ).toBe(true);
        });
      }
    });

    it('should use default limit when not specified', async () => {
      const context = {
        query: 'guide',
      };

      const result = await helpDocsSearchTool.execute({ context });

      expect(result.results.length).toBeLessThanOrEqual(5); // default limit
    });

    it('should generate suggested queries', async () => {
      const context = {
        query: 'database',
      };

      const result = await helpDocsSearchTool.execute({ context });

      expect(result.suggestedQueries).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/database/i)
        ])
      );
      expect(result.suggestedQueries.length).toBeGreaterThan(0);
      expect(result.suggestedQueries.length).toBeLessThanOrEqual(5);
    });

    it('should handle empty query gracefully', async () => {
      const context = {
        query: '',
      };

      const result = await helpDocsSearchTool.execute({ context });

      expect(result.success).toBe(true);
      expect(result.searchQuery).toBe('');
    });

    it('should handle queries with no matches', async () => {
      const context = {
        query: 'nonexistent-very-specific-topic-12345',
      };

      const result = await helpDocsSearchTool.execute({ context });

      expect(result.success).toBe(true);
      expect(result.totalResults).toBe(0);
      expect(result.results).toEqual([]);
    });
  });

  describe('result structure', () => {
    it('should return results with correct structure', async () => {
      const context = {
        query: 'authentication',
      };

      const result = await helpDocsSearchTool.execute({ context });

      if (result.results.length > 0) {
        const firstResult = result.results[0];
        
        expect(firstResult).toHaveProperty('url');
        expect(firstResult).toHaveProperty('title');
        expect(firstResult).toHaveProperty('excerpt');
        expect(firstResult).toHaveProperty('relevance');
        expect(firstResult).toHaveProperty('category');
        
        expect(typeof firstResult.url).toBe('string');
        expect(typeof firstResult.title).toBe('string');
        expect(typeof firstResult.excerpt).toBe('string');
        expect(typeof firstResult.relevance).toBe('number');
        expect(typeof firstResult.category).toBe('string');
        
        expect(firstResult.relevance).toBeGreaterThanOrEqual(0);
        expect(firstResult.relevance).toBeLessThanOrEqual(1);
      }
    });

    it('should sort results by relevance', async () => {
      const context = {
        query: 'authentication',
        limit: 3,
      };

      const result = await helpDocsSearchTool.execute({ context });

      if (result.results.length > 1) {
        for (let i = 0; i < result.results.length - 1; i++) {
          expect(result.results[i].relevance).toBeGreaterThanOrEqual(
            result.results[i + 1].relevance
          );
        }
      }
    });
  });

  describe('tool schema validation', () => {
    it('should validate input schema correctly', () => {
      const inputSchema = helpDocsSearchTool.inputSchema;
      
      const validInput = {
        query: 'test query',
        category: 'api',
        limit: 10,
      };

      const result = inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should require query field', () => {
      const inputSchema = helpDocsSearchTool.inputSchema;
      
      const invalidInput = {
        category: 'api',
        limit: 10,
      };

      const result = inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should use default limit when not provided', () => {
      const inputSchema = helpDocsSearchTool.inputSchema;
      
      const input = {
        query: 'test',
      };

      const result = inputSchema.parse(input);
      expect(result.limit).toBe(5); // default value
    });
  });
});

describe('formatHelpDocsResults', () => {
  it('should format results with proper markdown', () => {
    const results = [
      {
        url: 'https://docs.test.com/auth',
        title: 'Authentication Guide',
        excerpt: 'Learn how to authenticate users in your application.',
        relevance: 0.95,
      }
    ];

    const formatted = formatHelpDocsResults(results);

    expect(formatted).toContain('📖 Authentication Guide');
    expect(formatted).toContain('95%');
    expect(formatted).toContain('Learn how to authenticate users');
    expect(formatted).toContain('[Read more →](https://docs.test.com/auth)');
  });

  it('should handle empty results', () => {
    const formatted = formatHelpDocsResults([]);
    
    expect(formatted).toContain('No documentation found');
    expect(formatted).toContain('Try rephrasing');
  });

  it('should format multiple results with separators', () => {
    const results = [
      {
        url: 'https://docs.test.com/auth',
        title: 'Authentication',
        excerpt: 'Auth guide',
        relevance: 0.9,
      },
      {
        url: 'https://docs.test.com/api',
        title: 'API Reference',
        excerpt: 'API documentation',
        relevance: 0.8,
      }
    ];

    const formatted = formatHelpDocsResults(results);

    expect(formatted).toContain('Authentication');
    expect(formatted).toContain('API Reference');
    expect(formatted).toContain('---'); // separator
  });
});
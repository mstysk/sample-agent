import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { HelpDocumentReference, loadEnvironmentConfig } from '../types/environment';

export const helpDocsSearchTool = createTool({
  id: 'search-help-docs',
  description: 'Search for documentation from the help docs site to provide accurate technical guidance',
  inputSchema: z.object({
    query: z.string().describe('Natural language query to search for in documentation'),
    category: z.string().optional().describe('Documentation category to filter by (e.g., "api", "guides", "troubleshooting")'),
    limit: z.number().optional().default(5).describe('Maximum number of results to return'),
  }),
  outputSchema: z.object({
    results: z.array(z.object({
      url: z.string(),
      title: z.string(),
      excerpt: z.string(),
      relevance: z.number(),
      category: z.string(),
    })),
    totalResults: z.number(),
    searchQuery: z.string(),
    suggestedQueries: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    const config = loadEnvironmentConfig();
    
    try {
      // In a real implementation, this would use Mastra RAG system
      // For now, we'll simulate the RAG search functionality
      const mockResults = await searchHelpDocumentation(
        config.helpDocsUrl,
        context.query,
        context.category,
        context.limit
      );

      const suggestedQueries = generateSuggestedQueries(context.query, mockResults);

      return {
        results: mockResults.map(result => ({
          url: result.url,
          title: result.title,
          excerpt: result.excerpt,
          relevance: result.relevance,
          category: extractCategory(result.url),
        })),
        totalResults: mockResults.length,
        searchQuery: context.query,
        suggestedQueries,
      };
    } catch (error) {
      console.error('Help docs search failed:', error);
      return {
        results: [],
        totalResults: 0,
        searchQuery: context.query,
        suggestedQueries: [],
      };
    }
  },
});

async function searchHelpDocumentation(
  docsUrl: string,
  query: string,
  category?: string,
  limit?: number
): Promise<HelpDocumentReference[]> {
  // This is a mock implementation
  // In production, this would integrate with @mastra/rag system
  
  const mockResults: HelpDocumentReference[] = [
    {
      url: `${docsUrl}/api/authentication`,
      title: 'Authentication API Guide',
      excerpt: 'Learn how to authenticate users using our secure authentication system. Covers JWT tokens, OAuth integration, and best practices for session management.',
      relevance: 0.95,
    },
    {
      url: `${docsUrl}/guides/database-setup`,
      title: 'Database Configuration Guide',
      excerpt: 'Complete guide to setting up your database connection. Includes connection strings, environment variables, and troubleshooting common connection issues.',
      relevance: 0.88,
    },
    {
      url: `${docsUrl}/troubleshooting/common-errors`,
      title: 'Common Error Solutions',
      excerpt: 'Solutions to frequently encountered errors including connection timeouts, authentication failures, and deployment issues.',
      relevance: 0.82,
    },
    {
      url: `${docsUrl}/api/data-operations`,
      title: 'Data Operations API Reference',
      excerpt: 'Complete API reference for data operations including CRUD operations, filtering, pagination, and bulk operations.',
      relevance: 0.79,
    },
    {
      url: `${docsUrl}/guides/deployment`,
      title: 'Deployment Best Practices',
      excerpt: 'Step-by-step deployment guide covering production environments, scaling considerations, and monitoring setup.',
      relevance: 0.75,
    },
  ];

  // Filter by category if specified
  let filteredResults = mockResults;
  if (category) {
    filteredResults = mockResults.filter(result =>
      result.url.toLowerCase().includes(category.toLowerCase()) ||
      result.title.toLowerCase().includes(category.toLowerCase())
    );
  }

  // Simple relevance filtering based on query
  filteredResults = filteredResults.filter(result =>
    result.title.toLowerCase().includes(query.toLowerCase()) ||
    result.excerpt.toLowerCase().includes(query.toLowerCase())
  ).sort((a, b) => b.relevance - a.relevance);

  // Apply limit
  if (limit && limit > 0) {
    filteredResults = filteredResults.slice(0, limit);
  }

  return filteredResults;
}

function extractCategory(url: string): string {
  const urlParts = url.split('/');
  if (urlParts.length >= 4) {
    return urlParts[3]; // Assuming structure like docs.example.com/category/page
  }
  return 'general';
}

function generateSuggestedQueries(originalQuery: string, results: HelpDocumentReference[]): string[] {
  // Generate suggested queries based on search results
  const suggestions: string[] = [];
  
  if (results.length > 0) {
    // Extract common themes from results
    const themes = results.map(result => {
      const words = result.title.toLowerCase().split(' ');
      return words.filter(word => word.length > 3 && !['guide', 'reference', 'documentation'].includes(word));
    }).flat();
    
    const uniqueThemes = [...new Set(themes)].slice(0, 3);
    suggestions.push(...uniqueThemes.map(theme => `How to ${theme}`));
  }
  
  // Add common follow-up queries
  suggestions.push(
    `${originalQuery} troubleshooting`,
    `${originalQuery} best practices`,
    `${originalQuery} examples`
  );
  
  return suggestions.slice(0, 5);
}

// Helper function to format documentation search results for display
export function formatHelpDocsResults(results: HelpDocumentReference[]): string {
  if (results.length === 0) {
    return 'No documentation found for your query. Try rephrasing your question or checking the help docs directly.';
  }

  return results.map(result => `
**📖 ${result.title}**
*Relevance: ${Math.round(result.relevance * 100)}%*

${result.excerpt}

[Read more →](${result.url})
`).join('\n---\n');
}
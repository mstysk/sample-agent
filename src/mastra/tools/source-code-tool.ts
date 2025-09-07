import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { SourceCodeReference, loadEnvironmentConfig } from '../types/environment';

export const sourceCodeSearchTool = createTool({
  id: 'search-source-code',
  description: 'Search for source code in the GitHub repository to help with technical support',
  inputSchema: z.object({
    query: z.string().describe('Search query for finding relevant source code'),
    fileType: z.string().optional().describe('Filter by file extension (e.g., "ts", "js", "md")'),
    path: z.string().optional().describe('Specific directory path to search in'),
  }),
  outputSchema: z.object({
    results: z.array(z.object({
      repository: z.string(),
      filePath: z.string(),
      lineNumber: z.number().optional(),
      snippet: z.string(),
      relevance: z.number(),
      url: z.string(),
    })),
    totalResults: z.number(),
    searchQuery: z.string(),
  }),
  execute: async ({ context }) => {
    const config = loadEnvironmentConfig();
    
    try {
      // In a real implementation, this would use MCP filesync or GitHub API
      // For now, we'll simulate the search functionality
      const mockResults = await searchRepositoryCode(
        config.githubRepository,
        context.query,
        context.fileType,
        context.path
      );

      return {
        results: mockResults,
        totalResults: mockResults.length,
        searchQuery: context.query,
      };
    } catch (error) {
      console.error('Source code search failed:', error);
      return {
        results: [],
        totalResults: 0,
        searchQuery: context.query,
      };
    }
  },
});

async function searchRepositoryCode(
  repositoryUrl: string,
  query: string,
  fileType?: string,
  path?: string
): Promise<SourceCodeReference[]> {
  // This is a mock implementation
  // In production, this would integrate with MCP filesync or GitHub API
  
  const mockResults: SourceCodeReference[] = [
    {
      repository: repositoryUrl,
      filePath: 'src/components/AuthComponent.ts',
      lineNumber: 45,
      snippet: `// Authentication logic
export function authenticate(credentials: LoginCredentials) {
  return authService.login(credentials);
}`,
      relevance: 0.9,
    },
    {
      repository: repositoryUrl,
      filePath: 'src/utils/database.ts',
      lineNumber: 12,
      snippet: `// Database connection setup
export const dbConnection = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
};`,
      relevance: 0.8,
    },
  ];

  // Filter by file type if specified
  let filteredResults = mockResults;
  if (fileType) {
    filteredResults = mockResults.filter(result => 
      result.filePath.endsWith(`.${fileType}`)
    );
  }

  // Filter by path if specified
  if (path) {
    filteredResults = filteredResults.filter(result =>
      result.filePath.startsWith(path)
    );
  }

  // Filter by query relevance (simple contains check for mock)
  filteredResults = filteredResults.filter(result =>
    result.snippet.toLowerCase().includes(query.toLowerCase()) ||
    result.filePath.toLowerCase().includes(query.toLowerCase())
  );

  return filteredResults;
}

// Helper function to format code search results for display
export function formatSourceCodeResults(results: SourceCodeReference[]): string {
  if (results.length === 0) {
    return 'No source code found for your query.';
  }

  return results.map(result => `
**File:** \`${result.filePath}\`${result.lineNumber ? ` (line ${result.lineNumber})` : ''}
**Relevance:** ${Math.round(result.relevance * 100)}%

\`\`\`typescript
${result.snippet}
\`\`\`
`).join('\n---\n');
}
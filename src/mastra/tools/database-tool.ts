import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { loadEnvironmentConfig } from '../types/environment';

export const databaseConnectionTool = createTool({
  id: 'check-database-connection',
  description: 'Check database connection status and run basic diagnostic queries',
  inputSchema: z.object({
    action: z.enum(['status', 'tables', 'query', 'diagnostics']).describe('Action to perform: check connection status, list tables, run custom query, or run diagnostics'),
    query: z.string().optional().describe('Custom SQL query to execute (only for action: query)'),
    table: z.string().optional().describe('Specific table to analyze (optional)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    action: z.string(),
    result: z.any(),
    message: z.string(),
    suggestions: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    const config = loadEnvironmentConfig();
    
    try {
      switch (context.action) {
        case 'status':
          return await checkConnectionStatus(config.databaseConnection);
        case 'tables':
          return await listDatabaseTables(config.databaseConnection);
        case 'query':
          if (!context.query) {
            return {
              success: false,
              action: 'query',
              result: null,
              message: 'Query parameter is required for query action',
              suggestions: ['Provide a SQL query to execute'],
            };
          }
          return await executeCustomQuery(config.databaseConnection, context.query);
        case 'diagnostics':
          return await runDatabaseDiagnostics(config.databaseConnection, context.table);
        default:
          return {
            success: false,
            action: context.action,
            result: null,
            message: 'Invalid action specified',
            suggestions: ['Use one of: status, tables, query, diagnostics'],
          };
      }
    } catch (error) {
      console.error('Database tool error:', error);
      return {
        success: false,
        action: context.action,
        result: null,
        message: `Database operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestions: [
          'Check database connection settings in environment variables',
          'Verify database server is running',
          'Check network connectivity',
        ],
      };
    }
  },
});

async function checkConnectionStatus(dbConfig: any) {
  // Mock implementation - in production, this would use actual database connection
  const isConnected = await simulateConnectionCheck(dbConfig);
  
  if (isConnected) {
    return {
      success: true,
      action: 'status',
      result: {
        status: 'connected',
        host: dbConfig.host || 'localhost',
        database: dbConfig.database || 'default',
        connectionTime: '45ms',
      },
      message: 'Database connection is healthy',
      suggestions: [],
    };
  } else {
    return {
      success: false,
      action: 'status',
      result: {
        status: 'disconnected',
        host: dbConfig.host || 'localhost',
        database: dbConfig.database || 'default',
      },
      message: 'Unable to connect to database',
      suggestions: [
        'Check if database server is running',
        'Verify connection credentials',
        'Check firewall settings',
        'Confirm database exists',
      ],
    };
  }
}

async function listDatabaseTables(dbConfig: any) {
  // Mock implementation
  const mockTables = [
    { name: 'users', rows: 1250, size: '2.3MB' },
    { name: 'products', rows: 856, size: '1.8MB' },
    { name: 'orders', rows: 3421, size: '5.2MB' },
    { name: 'sessions', rows: 234, size: '0.5MB' },
  ];

  return {
    success: true,
    action: 'tables',
    result: {
      tables: mockTables,
      totalTables: mockTables.length,
    },
    message: `Found ${mockTables.length} tables in database`,
    suggestions: [
      'Use diagnostics action to analyze specific table performance',
      'Check table relationships and foreign keys',
    ],
  };
}

async function executeCustomQuery(dbConfig: any, query: string) {
  // Mock implementation with basic query validation
  const normalizedQuery = query.trim().toLowerCase();
  
  // Basic security check
  const dangerousKeywords = ['drop', 'delete', 'truncate', 'alter'];
  const hasDangerousKeyword = dangerousKeywords.some(keyword => 
    normalizedQuery.includes(keyword)
  );

  if (hasDangerousKeyword) {
    return {
      success: false,
      action: 'query',
      result: null,
      message: 'Query contains potentially dangerous operations',
      suggestions: [
        'Use read-only SELECT queries for safety',
        'Consider using specific diagnostic actions instead',
      ],
    };
  }

  // Mock query execution
  const mockResult = {
    query: query,
    rows: [
      { id: 1, name: 'Example Row 1', status: 'active' },
      { id: 2, name: 'Example Row 2', status: 'inactive' },
    ],
    executionTime: '123ms',
    rowCount: 2,
  };

  return {
    success: true,
    action: 'query',
    result: mockResult,
    message: 'Query executed successfully',
    suggestions: [],
  };
}

async function runDatabaseDiagnostics(dbConfig: any, table?: string) {
  // Mock diagnostic information
  const diagnostics = {
    connectionPool: {
      active: 5,
      idle: 15,
      total: 20,
    },
    performance: {
      avgResponseTime: '45ms',
      slowQueries: 2,
      lockedTables: 0,
    },
    storage: {
      totalSize: '125.6GB',
      freeSpace: '45.2GB',
      usage: '64%',
    },
  };

  if (table) {
    diagnostics['tableSpecific'] = {
      table: table,
      rowCount: 1250,
      indexCount: 3,
      lastUpdate: '2025-01-07 12:30:00',
      avgRowSize: '1.8KB',
    };
  }

  return {
    success: true,
    action: 'diagnostics',
    result: diagnostics,
    message: table ? `Diagnostics completed for table: ${table}` : 'General database diagnostics completed',
    suggestions: [
      'Monitor connection pool usage regularly',
      'Consider adding indexes for slow queries',
      'Schedule regular maintenance windows',
    ],
  };
}

async function simulateConnectionCheck(dbConfig: any): Promise<boolean> {
  // Simulate connection check based on configuration
  const hasRequiredConfig = dbConfig.host && dbConfig.database;
  
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Mock success rate (in production, this would be actual connection test)
  return hasRequiredConfig && Math.random() > 0.1; // 90% success rate
}

// Helper function to format database results for display
export function formatDatabaseResults(result: any): string {
  if (!result.success) {
    return `❌ **Database Error**\n\n${result.message}\n\n**Suggestions:**\n${result.suggestions.map(s => `• ${s}`).join('\n')}`;
  }

  switch (result.action) {
    case 'status':
      return `✅ **Database Status: ${result.result.status.toUpperCase()}**\n\nHost: ${result.result.host}\nDatabase: ${result.result.database}\n${result.result.connectionTime ? `Response Time: ${result.result.connectionTime}` : ''}`;
    
    case 'tables':
      const tables = result.result.tables.map(table => 
        `• **${table.name}** - ${table.rows} rows (${table.size})`
      ).join('\n');
      return `📊 **Database Tables (${result.result.totalTables})**\n\n${tables}`;
    
    case 'query':
      return `🔍 **Query Results**\n\nRows returned: ${result.result.rowCount}\nExecution time: ${result.result.executionTime}\n\n\`\`\`json\n${JSON.stringify(result.result.rows, null, 2)}\n\`\`\``;
    
    case 'diagnostics':
      const diag = result.result;
      return `🔧 **Database Diagnostics**\n\n**Connection Pool:**\n• Active: ${diag.connectionPool.active}\n• Idle: ${diag.connectionPool.idle}\n• Total: ${diag.connectionPool.total}\n\n**Performance:**\n• Avg Response: ${diag.performance.avgResponseTime}\n• Slow Queries: ${diag.performance.slowQueries}\n\n**Storage:**\n• Usage: ${diag.storage.usage} (${diag.storage.totalSize})`;
    
    default:
      return result.message;
  }
}
import { z } from 'zod';

export const LLMProviderSchema = z.enum(['ollama', 'openai', 'claude']);
export const StorageTypeSchema = z.enum(['libsql', 'mysql']);

export const DatabaseConnectionSchema = z.object({
  host: z.string().optional(),
  port: z.number().optional(),
  database: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

export const EnvironmentConfigSchema = z.object({
  llmProvider: LLMProviderSchema,
  storageType: StorageTypeSchema,
  githubRepository: z.string().url(),
  helpDocsUrl: z.string().url(),
  databaseConnection: DatabaseConnectionSchema,
});

export type LLMProvider = z.infer<typeof LLMProviderSchema>;
export type StorageType = z.infer<typeof StorageTypeSchema>;
export type DatabaseConnection = z.infer<typeof DatabaseConnectionSchema>;
export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;

export interface SourceCodeReference {
  repository: string;
  filePath: string;
  lineNumber?: number;
  snippet: string;
  relevance: number;
}

export interface HelpDocumentReference {
  url: string;
  title: string;
  excerpt: string;
  relevance: number;
}

export interface TechnicalIssue {
  id: string;
  description: string;
  category: string;
  technology: string;
  status: 'open' | 'resolved' | 'escalated';
  resolution?: string;
  timestamp: Date;
  relatedCode?: SourceCodeReference[];
  helpDocuments?: HelpDocumentReference[];
}

export interface ConversationContext {
  userId: string;
  sessionId: string;
  previousIssues: TechnicalIssue[];
  userSkillLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredExplanationStyle: 'concise' | 'detailed' | 'step-by-step';
}

export interface SupportResponse {
  content: string;
  type: 'troubleshooting' | 'explanation' | 'guidance' | 'code-analysis' | 'documentation';
  confidence: number;
  relatedResources?: {
    sourceCode?: SourceCodeReference[];
    documentation?: HelpDocumentReference[];
    databaseQueries?: string[];
  };
}

export function loadEnvironmentConfig(): EnvironmentConfig {
  const config = {
    llmProvider: (process.env.LLM_PROVIDER || 'ollama') as LLMProvider,
    storageType: (process.env.STORAGE_TYPE || 'libsql') as StorageType,
    githubRepository: process.env.GITHUB_REPOSITORY || 'https://github.com/logiless/logiless',
    helpDocsUrl: process.env.HELP_DOCS_URL || 'https://docs.logiless.com/',
    databaseConnection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
      database: process.env.DB_NAME,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
    },
  };

  return EnvironmentConfigSchema.parse(config);
}
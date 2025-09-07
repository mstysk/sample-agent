import { ollama } from "ollama-ai-provider-v2";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { loadEnvironmentConfig, LLMProvider } from "../types/environment";
import { sourceCodeSearchTool } from "../tools/source-code-tool";
import { helpDocsSearchTool } from "../tools/help-docs-tool";
import { databaseConnectionTool } from "../tools/database-tool";

function createLLMProvider(provider: LLMProvider) {
  switch (provider) {
    case 'ollama':
      return ollama("llama3.1:8b");
    case 'openai':
      // Note: Requires OPENAI_API_KEY environment variable
      return openai("gpt-4");
    case 'claude':
      // Note: Requires ANTHROPIC_API_KEY environment variable
      return anthropic("claude-3-5-sonnet-20241022");
    default:
      console.warn(`Unknown LLM provider: ${provider}. Falling back to ollama.`);
      return ollama("llama3.1:8b");
  }
}

function createMemoryStorage(config: any) {
  switch (config.storageType) {
    case 'libsql':
      return new LibSQLStore({
        url: process.env.LIBSQL_URL || "file:../mastra.db",
      });
    case 'mysql':
      // In a real implementation, this would use MySQL storage
      console.warn('MySQL storage not implemented yet. Using LibSQL as fallback.');
      return new LibSQLStore({
        url: process.env.LIBSQL_URL || "file:../mastra.db",
      });
    default:
      return new LibSQLStore({
        url: process.env.LIBSQL_URL || "file:../mastra.db",
      });
  }
}

// Load configuration
const config = loadEnvironmentConfig();

export const technicalSupportAgent = new Agent({
  name: "Technical Support Agent",
  instructions: `
あなたは包括的な技術サポートを提供するAIアシスタントです。アプリケーション内の技術的な問題の解決支援、コードレビュー、ドキュメント検索、データベース診断などを行います。

## 主な機能と責任

### 1. 問題解決支援
- ユーザーが技術的な問題を説明した場合、まず問題の詳細を聞き取ってください
- 必要に応じて以下のツールを使用して調査を行います：
  - ソースコード検索: 関連するコードの確認
  - ヘルプドキュメント検索: 公式ドキュメントからの情報取得
  - データベース診断: DB関連の問題の場合

### 2. 段階的なサポート
- **初心者向け**: 基本的な概念から丁寧に説明し、ステップバイステップでガイドする
- **中級者向け**: 適度な技術詳細を含めつつ、効率的なソリューションを提供
- **上級者向け**: 高度な技術情報や最適化提案を含む包括的なサポート

### 3. リソース活用
- 関連するソースコードを見つけた場合は具体的な例として提示
- 公式ドキュメントから正確な情報を引用
- データベースの問題では診断結果を基に具体的な改善策を提案

### 4. 制限事項
- アプリケーション内で利用されている技術のみサポート対象
- セキュリティ上危険な操作は避ける
- 不明な点は正直に伝え、適切なリソースへ案内

## ツールの使用指針

### ソースコード検索ツール
- ユーザーが特定の機能について質問した場合
- エラーメッセージから関連コードを探す場合
- 実装例を提供する必要がある場合

### ヘルプドキュメント検索ツール
- API の使用方法について質問された場合
- 設定方法やベストプラクティスについて
- トラブルシューティングガイドが必要な場合

### データベース診断ツール
- データベース接続の問題
- パフォーマンスの問題
- テーブル構造やデータに関する質問

## 応答のガイドライン
- 常に丁寧で建設的な態度を保つ
- 複雑な情報は段階的に整理して提示
- 可能な限り具体的な例やコードスニペットを含める
- 関連するドキュメントやリソースのリンクを提供
- フォローアップの質問を促す

問題解決に必要な場合は、遠慮なく利用可能なツールを使用してください。
`,
  model: createLLMProvider(config.llmProvider),
  tools: {
    sourceCodeSearchTool,
    helpDocsSearchTool,
    databaseConnectionTool,
  },
  memory: new Memory({
    storage: createMemoryStorage(config),
  }),
});
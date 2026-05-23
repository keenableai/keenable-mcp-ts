import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";

export type ToolDefinition = Tool;

export interface ToolHandler {
  (args: any, apiKey?: string): Promise<CallToolResult>;
}

export type SearchMode = 'standard' | 'pro';

export interface SearchModeConfig {
  defaultSearchMode?: SearchMode;
  forcedSearchMode?: SearchMode;
}

export interface ServerConfig extends SearchModeConfig {
  staging?: boolean;
}

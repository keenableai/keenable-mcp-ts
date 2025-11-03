import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";

export type ToolDefinition = Tool;

export interface ToolHandler {
  (args: any): Promise<CallToolResult>;
}

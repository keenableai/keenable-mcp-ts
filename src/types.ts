import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import type { AuthHeaders } from "./api.js";

export type ToolDefinition = Tool;

export interface ToolHandler {
  (args: any, authHeaders?: AuthHeaders): Promise<CallToolResult>;
}

import { ToolDefinition, ToolHandler, McpServerConfig } from "../types.js";
import { getSearchTool, createSearchHandler } from "./search.js";
import { fetchTool, createFetchHandler } from "./fetch.js";
import { feedbackTool, feedbackHandler } from "./feedback.js";

/**
 * Return tools list adjusted for the given search mode config.
 * Used by both stdio (env vars) and remote MCP (URL query params).
 */
export function getTools(config?: McpServerConfig): ToolDefinition[] {
  return [getSearchTool(config), fetchTool, feedbackTool];
}

/**
 * Return tool handlers adjusted for the given server config.
 */
export function getToolHandlers(config?: McpServerConfig): Record<string, ToolHandler> {
  return {
    search_web_pages: createSearchHandler(config),
    fetch_page_content: createFetchHandler(config),
    submit_search_feedback: feedbackHandler,
  };
}

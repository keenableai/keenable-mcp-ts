import { ToolDefinition, ToolHandler, SearchModeConfig } from "../types.js";
import { searchTool, searchHandler, getSearchTool, createSearchHandler } from "./search.js";
import { fetchTool, fetchHandler } from "./fetch.js";
import { feedbackTool, feedbackHandler } from "./feedback.js";

export const tools: ToolDefinition[] = [searchTool, fetchTool, feedbackTool];

export const toolHandlers: Record<string, ToolHandler> = {
  search_web_pages: searchHandler,
  fetch_page_content: fetchHandler,
  submit_search_feedback: feedbackHandler,
};

/**
 * Return tools list adjusted for the given search mode config.
 * Used by both stdio (env vars) and remote MCP (URL query params).
 */
export function getTools(config?: SearchModeConfig): ToolDefinition[] {
  return [getSearchTool(config), fetchTool, feedbackTool];
}

/**
 * Return tool handlers adjusted for the given search mode config.
 */
export function getToolHandlers(config?: SearchModeConfig): Record<string, ToolHandler> {
  return {
    search_web_pages: createSearchHandler(config),
    fetch_page_content: fetchHandler,
    submit_search_feedback: feedbackHandler,
  };
}

import { ToolDefinition, ToolHandler } from "../types.js";
import { searchTool, searchHandler } from "./search.js";
import { fetchTool, fetchHandler } from "./fetch.js";
import { feedbackTool, feedbackHandler } from "./feedback.js";

export const tools: ToolDefinition[] = [searchTool, fetchTool, feedbackTool];

export const toolHandlers: Record<string, ToolHandler> = {
  search_web_pages: searchHandler,
  fetch_page_content: fetchHandler,
  submit_search_feedback: feedbackHandler,
};

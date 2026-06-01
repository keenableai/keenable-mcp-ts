import { ToolDefinition, ToolHandler } from "../types.js";
import { makeApiRequest, getRateLimitReminder, RateLimitError } from "../api.js";

export const fetchTool: ToolDefinition = {
  name: "fetch_page_content",
  description: `Fetch and extract content from a web page. Returns the page content in markdown format.`,
  inputSchema: {
    type: "object",
    properties: {
      urls: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        description: "URLs to fetch (min 1). Example: [\"https://example.com\"]",
      },
    },
    required: ["urls"],
  },
  annotations: {
    title: "Fetch Page Content",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

export const fetchHandler: ToolHandler = async (args, apiKey) => {
  const { urls } = args as { urls: string[] };

  const blocks: string[] = [];
  const errors: string[] = [];

  for (const url of urls) {
    try {
      const data = await makeApiRequest("/v1/fetch", "GET", undefined, { url }, 3, apiKey);
      const title = data?.title || 'Untitled';
      const content = data?.content || '';
      blocks.push(`Title: ${title}\nURL: ${url}\n\n${content}`);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return {
          content: [
            {
              type: "text",
              text: getRateLimitReminder(error),
            },
          ],
          isError: true,
        };
      }
      errors.push(`Error fetching ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const parts = [...blocks];
  if (errors.length > 0) parts.push(errors.join('\n'));

  return {
    content: [
      {
        type: "text",
        text: parts.join('\n\n---\n\n') || 'No content fetched.',
      },
    ],
    ...(errors.length > 0 && blocks.length === 0 ? { isError: true } : {}),
  };
};

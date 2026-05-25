import { ToolDefinition, ToolHandler } from "../types.js";
import { makeApiRequest, getRateLimitReminder, RateLimitError } from "../api.js";

export const fetchTool: ToolDefinition = {
  name: "fetch_page_content",
  description: `Fetch and extract content from a web page. Returns the page content in markdown format.`,
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The URL to fetch. Example: \"https://example.com\"",
      },
    },
    required: ["url"],
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
  const { url } = args as { url: string };

  try {
    const data = await makeApiRequest("/v1/fetch", "GET", undefined, { url }, 3, apiKey);

    const title = data?.title || 'Untitled';
    const content = data?.content || '';

    return {
      content: [
        {
          type: "text",
          text: `Title: ${title}\nURL: ${url}\n\n${content}`,
        },
      ],
    };
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
    return {
      content: [
        {
          type: "text",
          text: `Error fetching ${url}: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
};

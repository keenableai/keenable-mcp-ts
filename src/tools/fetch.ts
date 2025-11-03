import { ToolDefinition, ToolHandler } from "../types.js";
import { makeApiRequest, getUpgradeReminder, getRateLimitReminder, getUnauthorizedReminder, RateLimitError, UnauthorizedError, isAuthenticated } from "../api.js";

export const fetchTool: ToolDefinition = {
  name: "fetch_page_content",
  description: `Use this tool to fetch and extract content from one or more URLs. Returns each page content in markdown format as a separate message.`,
  inputSchema: {
    type: "object",
    properties: {
      urls: {
        type: "array",
        items: {
          type: "string",
        },
        description: "Array of URLs to fetch and extract content from",
        minItems: 1,
      },
    },
    required: ["urls"],
  },
};

export const fetchHandler: ToolHandler = async (args) => {
  const { urls } = args as { urls: string[] };

  try {
    const CHUNK_SIZE = 5;
    const results: any[] = [];
    
    for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
      const chunk = urls.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(
        chunk.map(url => makeApiRequest("/v1/fetch", "GET", undefined, { url }))
      );
      results.push(...chunkResults);
    }

    const content: any[] = results.map((data, index) => ({
      type: "text",
      text: `## URL: ${urls[index]}\n\n${JSON.stringify(data, null, 2)}`,
    }));

    if (!isAuthenticated()) {
      content.push({
        type: "text",
        text: getUpgradeReminder(),
      });
    }

    return { content };
  } catch (error) {
    if (error instanceof RateLimitError) {
      return {
        content: [
          {
            type: "text",
            text: getRateLimitReminder(),
          },
        ],
        isError: true,
      };
    }
    if (error instanceof UnauthorizedError) {
      return {
        content: [
          {
            type: "text",
            text: getUnauthorizedReminder(),
          },
        ],
        isError: true,
      };
    }
    throw error;
  }
};

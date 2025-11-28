import { ToolDefinition, ToolHandler } from "../types.js";
import { makeApiRequest, getUpgradeReminder, getRateLimitReminder, getUnauthorizedReminder, RateLimitError, UnauthorizedError, UnprocessableContentError, isAuthenticated } from "../api.js";

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

export const fetchHandler: ToolHandler = async (args, apiKey) => {
  const { urls } = args as { urls: string[] };

  const CHUNK_SIZE = 5;
  const results: Array<{ url: string; data?: any; error?: string }> = [];
  
  let hasRateLimitError = false;
  let hasUnauthorizedError = false;
  
  for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
    const chunk = urls.slice(i, i + CHUNK_SIZE);
    const chunkResults = await Promise.allSettled(
      chunk.map(async (url) => {
        try {
          const data = await makeApiRequest("/v1/fetch", "GET", undefined, { url }, 3, apiKey);
          return { url, data };
        } catch (error) {
          if (error instanceof RateLimitError) {
            hasRateLimitError = true;
            throw error;
          }
          if (error instanceof UnauthorizedError) {
            hasUnauthorizedError = true;
            throw error;
          }
          return { 
            url, 
            error: error instanceof Error ? error.message : String(error) 
          };
        }
      })
    );
    
    for (const result of chunkResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        if (result.reason instanceof RateLimitError) {
          hasRateLimitError = true;
        } else if (result.reason instanceof UnauthorizedError) {
          hasUnauthorizedError = true;
        }
      }
    }
    
    if (hasRateLimitError || hasUnauthorizedError) {
      break;
    }
  }

  if (hasRateLimitError) {
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
  
  if (hasUnauthorizedError) {
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

  const content: any[] = results.map((result) => {
    if (result.error) {
      return {
        type: "text",
        text: `## URL: ${result.url}\n\n**Error:** ${result.error}`,
      };
    }
    return {
      type: "text",
      text: `## URL: ${result.url}\n\n${JSON.stringify(result.data, null, 2)}`,
    };
  });

  if (!isAuthenticated()) {
    content.push({
      type: "text",
      text: getUpgradeReminder(),
    });
  }

  return { content };
};

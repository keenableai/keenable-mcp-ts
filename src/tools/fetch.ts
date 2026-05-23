import { ToolDefinition, ToolHandler, ServerConfig } from "../types.js";
import { makeApiRequest, getRateLimitReminder, RateLimitError } from "../api.js";

export const fetchTool: ToolDefinition = {
  name: "fetch_page_content",
  description: `Fetch and extract content from one or more web pages. Returns each page content in markdown format as a separate message. Pass URLs as an array to the "urls" parameter — do not use "url"`,
  inputSchema: {
    type: "object",
    properties: {
      urls: {
        type: "array",
        items: {
          type: "string",
        },
        description: "A JSON array of URLs to fetch. Always pass an array, even for a single URL. Example: [\"https://example.com\"]",
        minItems: 1,
      },
    },
    required: ["urls"],
  },
  annotations: {
    title: "Fetch Page Content",
    readOnlyHint: true,        // This tool only reads and extracts content from URLs without modifying anything
    destructiveHint: false,    // No data is deleted or overwritten when fetching page content
    idempotentHint: true,
    openWorldHint: true,       // Fetches content from the open internet, accessing any publicly available URL
  },
};

export function createFetchHandler(config?: ServerConfig): ToolHandler {
  return async (args, apiKey) => {
  const { urls } = args as { urls: string[] };

  const CHUNK_SIZE = 5;
  const results: Array<{ url: string; data?: any; error?: string }> = [];
  
  let rateLimitError: RateLimitError | null = null;
  
  for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
    const chunk = urls.slice(i, i + CHUNK_SIZE);
    const chunkResults = await Promise.allSettled(
      chunk.map(async (url) => {
        try {
          const params: Record<string, string> = { url };
          if (config?.staging) params.staging = '1';
          const data = await makeApiRequest("/v1/fetch", "GET", undefined, params, 3, apiKey);
          return { url, data };
        } catch (error) {
          if (error instanceof RateLimitError) {
            rateLimitError = error;
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
          rateLimitError = result.reason;
        }
      }
    }
    
    if (rateLimitError) {
      break;
    }
  }

  if (rateLimitError) {
    return {
      content: [
        {
          type: "text",
          text: getRateLimitReminder(rateLimitError),
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

  return { content };
  };
}

export const fetchHandler: ToolHandler = createFetchHandler();

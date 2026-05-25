import { ToolDefinition, ToolHandler } from "../types.js";
import { makeApiRequest, getRateLimitReminder, RateLimitError } from "../api.js";

export const feedbackTool: ToolDefinition = {
  name: "submit_search_feedback",
  description: `Every call to search_web_pages MUST be followed by a call to this tool to submit feedback on the search results. This applies only to search results, not to fetch_page_content. For each URL returned by search, provide a relevance score (0-5) and a comment explaining the score. Scores: 0 = content not loaded properly, 1 = not relevant at all, 2 = slightly relevant, 3 = moderately relevant, 4 = very relevant, 5 = perfectly relevant.`,
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The original search query",
      },
      relevance: {
        type: "array",
        description: "Per-URL relevance scores and comments",
        items: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The result URL being scored",
            },
            score: {
              type: "integer",
              minimum: 0,
              maximum: 5,
              description: "Relevance score from 0 to 5",
            },
            comment: {
              type: "string",
              description: "Explanation of why this score was given",
            },
          },
          required: ["url", "score", "comment"],
        },
      },
    },
    required: ["query", "relevance"],
  },
  annotations: {
    title: "Submit Search Feedback",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};

export const feedbackHandler: ToolHandler = async (args, apiKey) => {
  const { query, relevance } = args as {
    query: string;
    relevance: Array<{ url: string; score: number; comment: string }>;
  };

  try {
    const data = await makeApiRequest("/v1/feedback", "POST", { query, relevance }, undefined, 3, apiKey);

    return {
      content: [
        {
          type: "text",
          text: data.message,
        }
      ]
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
          text: `Error submitting feedback: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
};

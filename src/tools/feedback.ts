import { ToolDefinition, ToolHandler } from "../types.js";
import { makeApiRequest, getUpgradeReminder, getRateLimitReminder, getUnauthorizedReminder, RateLimitError, UnauthorizedError, isAuthenticated } from "../api.js";

export const feedbackTool: ToolDefinition = {
  name: "submit_search_feedback",
  description: `After each search use this tool to submit feedback on search results to improve quality. Provide relevance scores (1-5) for URLs`,
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The original search query",
      },
      feedback: {
        type: "object",
        description: "Mapping of result URLs to relevance scores (1-5)",
        additionalProperties: {
          type: "number",
          minimum: 1,
          maximum: 5,
        },
      },
      feedback_text: {
        type: "string",
        description: "Additional feedback text (optional)",
      },
    },
    required: ["query", "feedback"],
  },
};

export const feedbackHandler: ToolHandler = async (args, authHeaders) => {
  const { query, feedback, feedback_text } = args as {
    query: string;
    feedback: Record<string, number>;
    feedback_text?: string;
  };

  try {
    const body: any = { query, feedback };
    if (feedback_text) {
      body.feedback_text = feedback_text;
    }

    const data = await makeApiRequest("/v1/feedback", "POST", body, undefined, 3, authHeaders);

    return {
      content: [
        {
          type: "text",
          text: data.message,
        },
        ...(!isAuthenticated() ? [{
          type: "text" as const,
          text: getUpgradeReminder(),
        }] : []),
      ],
    };
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

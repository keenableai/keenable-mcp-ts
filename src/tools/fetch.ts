import { ToolDefinition, ToolHandler } from "../types.js";
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
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^.*\.localhost$/i,
  /^metadata\.google\.internal$/i,
];

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^\[?::1]?$/,
  /^\[?fc[0-9a-f]{2}:/i,
  /^\[?fe80:/i,
];

function validateUrl(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return `Invalid URL — could not parse "${raw}"`;
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return `Unsupported scheme "${parsed.protocol.replace(":", "")}" — only http and https are allowed`;
  }

  if (!parsed.hostname) {
    return "URL is missing a hostname";
  }

  if (parsed.port) {
    const port = parseInt(parsed.port, 10);
    if (isNaN(port) || port <= 0 || port > 65535) {
      return `Invalid port ${parsed.port} — must be between 1 and 65535`;
    }
  }

  const host = parsed.hostname.toLowerCase();

  for (const pattern of PRIVATE_HOSTNAME_PATTERNS) {
    if (pattern.test(host)) {
      return `Blocked: "${host}" is a private/internal host`;
    }
  }

  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(host)) {
      return `Blocked: "${host}" is a private/internal IP address`;
    }
  }

  return null;
}

function formatResult(result: { url: string; data?: any; error?: string }): { type: "text"; text: string } {
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
}

export const fetchHandler: ToolHandler = async (args, apiKey) => {
  const { urls } = args as { urls: string[] };

  const CHUNK_SIZE = 5;
  const results: Array<{ url: string; data?: any; error?: string }> = [];

  let rateLimitError: RateLimitError | null = null;

  const validUrls: string[] = [];
  for (const url of urls) {
    const validationError = validateUrl(url);
    if (validationError) {
      results.push({ url, error: validationError });
    } else {
      validUrls.push(url);
    }
  }

  for (let i = 0; i < validUrls.length; i += CHUNK_SIZE) {
    const chunk = validUrls.slice(i, i + CHUNK_SIZE);
    const chunkResults = await Promise.allSettled(
      chunk.map(async (url) => {
        try {
          const data = await makeApiRequest("/v1/fetch", "GET", undefined, { url }, 3, apiKey);

          if (data && !data.content) {
            return {
              url,
              error: "Page was fetched but no content could be extracted (may be empty, dynamically rendered, or an unsupported format like PDF)",
            };
          }

          return { url, data };
        } catch (error) {
          if (error instanceof RateLimitError) {
            rateLimitError = error;
            throw error;
          }
          const statusCode = (error as any)?.statusCode;
          const baseMsg = error instanceof Error ? error.message : String(error);
          const detail = statusCode === 500
            ? `Upstream fetch failed — the target page may not exist, may have timed out, or returned an error`
            : baseMsg;
          return { url, error: detail };
        }
      })
    );

    for (const result of chunkResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      }
    }

    if (rateLimitError) {
      break;
    }
  }

  if (results.length === 0 && !rateLimitError) {
    return {
      content: [
        {
          type: "text",
          text: "No results — all provided URLs were invalid.",
        },
      ],
      isError: true,
    };
  }

  const content = results.map(formatResult);

  if (rateLimitError) {
    content.push({
      type: "text",
      text: getRateLimitReminder(rateLimitError),
    });
    return { content, isError: true };
  }

  const allFailed = results.every((r) => r.error);
  return { content, ...(allFailed && { isError: true }) };
};

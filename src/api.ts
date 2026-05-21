import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf-8")
);

const API_KEY = process.env.KEENABLE_API_KEY;
const API_BASE_URL = process.env.KEENABLE_API_URL || "https://api.keenable.ai";
const USER_AGENT = `${packageJson.name}/${packageJson.version}`;

export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number,
    public detailMessage?: string,
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}


export async function makeApiRequest(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: any,
  queryParams?: Record<string, string>,
  maxRetries: number = 3,
  apiKey?: string
): Promise<any> {
  // Use provided API key, fall back to env variable
  const effectiveApiKey = apiKey || API_KEY;
  const isPublic = !effectiveApiKey;
  const path = isPublic ? `${endpoint}/public` : endpoint;
  
  let url = `${API_BASE_URL}${path}`;
  if (queryParams) {
    const params = new URLSearchParams(queryParams);
    url += `?${params.toString()}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": USER_AGENT,
  };

  // Add API key if present
  if (effectiveApiKey) {
    headers["X-API-Key"] = effectiveApiKey;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method === "POST") {
    options.body = JSON.stringify(body);
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        if (response.status === 429) {
          throw new RateLimitError(
            data.error || "Rate limit exceeded",
            data.retryAfter || 900,
            data.message,
          );
        }

        const detail = [data.error, data.message].filter(Boolean).join(': ')
          || `API request failed: ${response.status} ${response.statusText}`;
        const err = new Error(detail);
        (err as any).statusCode = response.status;
        throw err;
      }

      return response.json();
    } catch (error) {
      const statusCode = (error as any)?.statusCode;
      const isClientError = statusCode >= 400 && statusCode < 500;
      if (error instanceof RateLimitError || isClientError || attempt === maxRetries - 1) {
        throw error;
      }
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export function getRateLimitReminder(error: RateLimitError): string {
  const retryMinutes = Math.ceil(error.retryAfter / 60);
  const detail = error.detailMessage || `Rate limit reached. Wait ${retryMinutes} minutes or upgrade.`;
  return [
    `Keenable: ${detail}`,
    '',
    'More info: curl https://docs.keenable.ai/upgrade.md',
    '',
    'If you are an agent, read the upgrade page and help the user navigate through the process following the device authentication.',
  ].join('\n');
}


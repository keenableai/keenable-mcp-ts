# Keenable MCP Server

A Model Context Protocol (MCP) library and stdio server providing web search, content fetching, and feedback tools powered by Keenable AI.

## Features

- **search_web_pages** - Search the web with Keenable AI
- **fetch_page_content** - Extract content from one or more URLs in markdown format
- **submit_search_feedback** - Submit relevance feedback to improve search quality
- **Stdio Transport** - Standard MCP communication for local clients
- **NPM Package** - Import tools and handlers in your own applications

Supports both authenticated (no rate limits) and public (30 requests per IP per 15 minutes) modes.

## Prerequisites

- Node.js (includes npm and npx)

## Configuration

Add to your MCP client configuration (e.g., Claude Desktop at `~/Library/Application Support/Claude/claude_desktop_config.json`):

### Drop-in demo snippet (rate limits without authentication)

```json
{
  "mcpServers": {
    "keenable": {
      "command": "npx",
      "args": ["-y", "@keenable/mcp-server"]
    }
  }
}
```

### Authenticated production snippet

```json
{
  "mcpServers": {
    "keenable": {
      "command": "npx",
      "args": ["-y", "@keenable/mcp-server"],
      "env": {
        "KEENABLE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Get your API key at [https://keenable.ai](https://keenable.ai).

## Using as an NPM Package

Install the package and import the tools in your own application:

```bash
npm install @keenable/mcp-server
```

```typescript
import { tools, toolHandlers } from '@keenable/mcp-server';

// Option 1: Use environment variable (stdio MCP servers)
process.env.KEENABLE_API_KEY = 'your-api-key';
const result1 = await toolHandlers['search_web_pages']({ query: 'TypeScript', count: 5 });

// Option 2: Pass API key explicitly (HTTP servers, per-request auth)
const result2 = await toolHandlers['search_web_pages'](
  { query: 'TypeScript', count: 5 },
  'your-api-key' // optional apiKey parameter
);
```

**Exported items:**
- `tools` - Array of MCP tool definitions
- `toolHandlers` - Object mapping tool names to handler functions
- `ToolDefinition` - TypeScript type for tool definitions
- `ToolHandler` - TypeScript type: `(args: any, apiKey?: string) => Promise<CallToolResult>`

**Authentication:**
- **Environment variable**: Set `KEENABLE_API_KEY` for stdio MCP servers (Claude Desktop)
- **Per-request**: Pass `apiKey` as second parameter for HTTP servers with per-request authentication
- **Public**: Without auth, requests use public endpoints with rate limits (30 requests per IP per 15 minutes)

See [keenable-backend-ts](https://github.com/keenableai/keenable-backend-ts) for an example of building an HTTP server with this package.

## Development

Clone the repository and build from source:

```bash
git clone https://github.com/keenable/keenable-mcp-ts.git
cd keenable-mcp-ts
npm install
npm run build
```

## Publishing

This project uses GitHub Actions to automatically publish to npm registry on version tags.

### Publishing a New Version

```bash
npm version patch  # or minor, or major
git push && git push --tags
```

This will automatically trigger the npm publish workflow.

## Tools

### search_web_pages
Search the web using Keenable AI.

**Parameters:**
- `query` (string, required) - Search query
- `count` (number, optional) - Number of results (1-20, default: 10)

### fetch_page_content
Fetch and extract content from one or more URLs in markdown format

**Parameters:**
- `urls` (array of strings, required) - Array of URLs to fetch (minimum 1)

**Returns:** Each page's content as a separate message with the URL as a header.

**Note:** reddit.com, twitter.com, and x.com are blocked.

### submit_search_feedback
Submit feedback on search results to improve quality.

**Parameters:**
- `query` (string, required) - Original search query
- `feedback` (object, required) - Mapping of URLs to relevance scores (1-5)
- `feedback_text` (string, optional) - Additional feedback text

## Rate Limits

- **Public endpoints**: 30 requests per IP per 15 minutes
- **Authenticated endpoints**: No rate limits

## License

MIT

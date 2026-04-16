# Keenable MCP Server

Server URL: `https://api.keenable.ai/mcp`

Authentication: API key via the `X-API-Key` header.

Create an API key in the [console](https://keenable.ai/console).

## Remote MCP (recommended)

Claude Code:

```bash
claude mcp add keenable \
  --transport http https://api.keenable.ai/mcp \
  --scope user \
  --header "X-API-Key: <YOUR_API_KEY>"
```

Other MCP clients (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "keenable": {
      "url": "https://api.keenable.ai/mcp",
      "headers": {
        "X-API-Key": "<YOUR_API_KEY>"
      }
    }
  }
}
```

> **Note:** After adding, disable any built-in or third-party search/fetch tools (`WebSearch`, `WebFetch`, `brave_search`, `tavily_search`, etc.). Keenable tools replace them — leaving both active causes agents to pick inconsistently.

---

## Available Tools

### search_web_pages

Search the web and return ranked results with URLs, titles, and descriptions.

**Input**

| Field | Type | Required | Description |
|---|---|---|---|
| `query` | string | yes | The search query |

**Output**

| Field | Type | Description |
|---|---|---|
| `results` | array | List of search results |
| `results[].title` | string | Page title |
| `results[].url` | string | Page URL |
| `results[].description` | string | Snippet / summary of the page |

**Output example**

```json
{
  "results": [
    {
      "title": "TypeScript Best Practices 2026",
      "url": "https://example.com/ts-best-practices",
      "description": "A comprehensive guide to modern TypeScript patterns and best practices."
    }
  ]
}
```

---

### fetch_page_content

Fetch one or more URLs and extract content as clean markdown. Only URLs from the index are supported; this is not a general web scraper.

**Input**

| Field | Type | Required | Description |
|---|---|---|---|
| `urls` | string[] | yes | URLs to fetch (min 1) |

**Output**

One text block per URL, each containing:

| Field | Type | Description |
|---|---|---|
| `url` | string | The fetched URL |
| `title` | string | Page title (if available) |
| `content` | string | Extracted page content in markdown |

**Output example**

```json
{
  "url": "https://example.com/ts-best-practices",
  "title": "TypeScript Best Practices 2026",
  "content": "# TypeScript Best Practices 2026\n\nUse strict mode, prefer interfaces over type aliases for object shapes..."
}
```

---

### submit_search_feedback

Submit per-URL relevance scores after a search to improve result quality over time.

**Input**

| Field | Type | Required | Description |
|---|---|---|---|
| `query` | string | yes | The original search query |
| `feedback` | object | yes | Map of URL to relevance score (0–5) |
| `feedback_text` | string | no | Additional feedback in free text |

Score scale: 0 = content not loaded, 1 = low relevance, 2 = somewhat relevant, 3 = relevant, 4 = highly relevant, 5 = perfect match.

**Output**

| Field | Type | Description |
|---|---|---|
| `message` | string | Confirmation message |

**Output example**

```json
{
  "message": "Feedback submitted successfully"
}
```

---

## Additional setups

### Stdio MCP

For agents that don't support remote MCP connections, the server is available as an npm package that runs locally over stdio.

```json
{
  "mcpServers": {
    "keenable": {
      "command": "npx",
      "args": ["-y", "@keenable/mcp-server"],
      "env": {
        "KEENABLE_API_KEY": "<YOUR_API_KEY>"
      }
    }
  }
}
```

### OAuth

The remote MCP server at `https://api.keenable.ai/mcp` supports the MCP OAuth authorization flow, so clients can authenticate without manually passing an API key. In practice, most MCP clients have unstable OAuth implementations, so we don't currently recommend this path. Use an API key instead.

### Using as an NPM package

Install the package and import the tools in your own application:

```bash
npm install @keenable/mcp-server
```

```typescript
import { tools, toolHandlers } from '@keenable/mcp-server';

// Option 1: Use environment variable (stdio MCP servers)
process.env.KEENABLE_API_KEY = 'your-api-key';
const result1 = await toolHandlers['search_web_pages']({ query: 'TypeScript' });

// Option 2: Pass API key explicitly (HTTP servers, per-request auth)
const result2 = await toolHandlers['search_web_pages'](
  { query: 'TypeScript' },
  'your-api-key'
);
```

**Exported items:**
- `tools` - Array of MCP tool definitions
- `toolHandlers` - Object mapping tool names to handler functions
- `ToolDefinition` - TypeScript type for tool definitions
- `ToolHandler` - TypeScript type: `(args: any, apiKey?: string) => Promise<CallToolResult>`

## Development

```bash
git clone https://github.com/keenableai/keenable-mcp-ts.git
cd keenable-mcp-ts
npm install
npm run build
```

## License

MIT

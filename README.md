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
| `site` | string | no | Restrict results to a specific site (e.g. `"techcrunch.com"`) |
| `acquired_after` | string | no | Filter to pages acquired/indexed after this date (YYYY-MM-DD) |
| `acquired_before` | string | no | Filter to pages acquired/indexed before this date (YYYY-MM-DD) |
| `published_after` | string | no | Filter to pages published after this date (YYYY-MM-DD) |
| `published_before` | string | no | Filter to pages published before this date (YYYY-MM-DD) |
| `mode` | string | no | Search mode: `"pro"` (default, higher-quality results) or `"realtime"` (fastest) |

**Output**

| Field | Type | Description |
|---|---|---|
| `mode` | string | Search mode used (`"realtime"` or `"pro"`) |
| `results` | array | List of search results |
| `results[].title` | string | Page title |
| `results[].url` | string | Page URL |
| `results[].description` | string | Snippet / summary of the page |
| `results[].published_at` | string | When the page was published (ISO 8601, if available) |
| `results[].acquired_at` | string | When the page was acquired/indexed (ISO 8601, if available) |

**Output example**

```json
{
  "query": "TypeScript best practices",
  "mode": "pro",
  "results": [
    {
      "title": "TypeScript Best Practices 2026",
      "url": "https://example.com/ts-best-practices",
      "description": "A comprehensive guide to modern TypeScript patterns and best practices.",
      "published_at": "2026-01-15T10:30:00Z",
      "acquired_at": "2026-01-16T08:12:34Z"
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

Submit per-URL relevance scores and comments after a search to improve result quality over time.

**Input**

| Field | Type | Required | Description |
|---|---|---|---|
| `query` | string | yes | The original search query |
| `relevance` | array | yes | Per-URL relevance entries |
| `relevance[].url` | string | yes | The result URL being scored |
| `relevance[].score` | number | yes | Relevance score (0–5) |
| `relevance[].comment` | string | yes | Explanation of why this score was given |

Score scale: 0 = content not loaded, 1 = not relevant at all, 2 = slightly relevant, 3 = moderately relevant, 4 = very relevant, 5 = perfectly relevant.

**Input example**

```json
{
  "query": "TypeScript best practices",
  "relevance": [
    {
      "url": "https://example.com/ts-best-practices",
      "score": 5,
      "comment": "Comprehensive guide covering exactly what was asked"
    },
    {
      "url": "https://example.com/js-patterns",
      "score": 2,
      "comment": "Covers JavaScript patterns but not TypeScript-specific"
    }
  ]
}
```

**Output**

| Field | Type | Description |
|---|---|---|
| `message` | string | Confirmation message |

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

### Search mode configuration

You can control the search mode via environment variables (stdio) or URL query params (remote MCP):

| Setting | Env var (stdio) | Query param (remote) | Effect |
|---|---|---|---|
| Default mode | `KEENABLE_DEFAULT_SEARCH_MODE` | `default_search_mode` | Overrides the default when the agent doesn't specify `mode` |
| Forced mode | `KEENABLE_FORCED_SEARCH_MODE` | `forced_search_mode` | Always uses this mode; hides the `mode` param from the tool schema |

Valid values: `realtime`, `pro`.

**Stdio example** — always use pro mode:

```json
{
  "mcpServers": {
    "keenable": {
      "command": "npx",
      "args": ["-y", "@keenable/mcp-server"],
      "env": {
        "KEENABLE_API_KEY": "<YOUR_API_KEY>",
        "KEENABLE_FORCED_SEARCH_MODE": "pro"
      }
    }
  }
}
```

**Remote MCP example** — default to pro mode (agent can still override):

```
https://api.keenable.ai/mcp?default_search_mode=pro
```

### OAuth

The remote MCP server at `https://api.keenable.ai/mcp` supports the MCP OAuth authorization flow, so clients can authenticate without manually passing an API key. In practice, most MCP clients have unstable OAuth implementations, so we don't currently recommend this path. Use an API key instead.

## Development

```bash
git clone https://github.com/keenableai/keenable-mcp-ts.git
cd keenable-mcp-ts
npm install
npm run build
```

## License

MIT

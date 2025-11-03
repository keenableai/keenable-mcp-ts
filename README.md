# Keenable MCP Server

A Model Context Protocol (MCP) server providing web search, content fetching, and feedback tools powered by Keenable AI.

## Features

- **search_web_pages** - Search the web with Keenable AI
- **fetch_page_content** - Extract content from one or more URLs in markdown format
- **submit_search_feedback** - Submit relevance feedback to improve search quality

Supports both authenticated (no rate limits) and public (30 requests per IP per 15 minutes) modes.

## Prerequisites

- Node.js (includes npm and npx)

## Configuration

Add to your MCP client configuration (e.g., Claude Desktop at `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "keenable": {
      "command": "npx",
      "args": ["keenable-mcp-server"],
      "env": {
        "KEENABLE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Omit the `env` section to use public endpoints. Get your API key at [https://keenable.ai](https://keenable.ai).

## Development

Clone the repository and build from source:

```bash
git clone https://github.com/keenable/keenable-mcp-ts.git
cd keenable-mcp-ts
npm install
npm run build
```

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

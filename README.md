# Keenable MCP Server

A Model Context Protocol (MCP) server providing web search, content fetching, and feedback tools powered by Keenable AI. Supports both stdio and HTTP streamable transports.

## Features

- **search_web_pages** - Search the web with Keenable AI
- **fetch_page_content** - Extract content from one or more URLs in markdown format
- **submit_search_feedback** - Submit relevance feedback to improve search quality
- **HTTP Streamable Transport** - RESTful API with Server-Sent Events support
- **Stdio Transport** - Standard MCP communication for local clients

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

## HTTP Streamable Mode

The server also supports HTTP streamable transport for web-based applications and remote clients.

### Starting the HTTP Server

```bash
# Development mode
npm run dev:http

# Production mode
npm run start:http
```

The server will start on `http://localhost:3000/mcp` by default. You can customize the port and host:

```bash
PORT=8080 HOST=0.0.0.0 npm run start:http
```

### HTTP API Endpoints

- **POST /mcp** - Main MCP communication endpoint
- **GET /mcp** - Server-to-client notifications via SSE (with sessions)
- **DELETE /mcp** - Session termination (with sessions)
- **GET /health** - Health check endpoint

### Example Client Usage

```javascript
// Using MCP client with HTTP transport
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const client = new Client({
  name: 'example-client',
  version: '1.0.0'
});

const transport = new StreamableHTTPClientTransport(new URL('http://localhost:3000/mcp'));
await client.connect(transport);

// Use tools
const result = await client.callTool({
  name: 'search_web_pages',
  arguments: { query: 'TypeScript MCP server', count: 5 }
});
```

### Stateless vs Stateful Mode

The HTTP server runs in **stateless mode** by default, creating a new transport for each request. This is suitable for:

- API gateways and load balancers
- Serverless environments
- Simple client-server interactions

For **stateful sessions** (maintaining conversation state), clients can include session management headers.

### Example Usage

```bash
# Start the HTTP server
npm run start:http

# Run the example client (requires server to be running)
npm run example:http

# Run the automated test (starts server, runs tests, stops server)
npm run test:http
```

## Development

Clone the repository and build from source:

```bash
git clone https://github.com/keenable/keenable-mcp-ts.git
cd keenable-mcp-ts
npm install
npm run build
```

## CI/CD

This project uses GitHub Actions for automated building, testing, and deployment:

- **Automated Testing**: Runs on every push and pull request
- **ECR Deployment**: Automatically builds and pushes Docker images to AWS ECR on main branch and version tags
- **npm Publishing**: Automatically publishes to npm registry on version tags

See [CI/CD Setup Guide](.github/CICD_SETUP.md) for configuration details.

### Publishing a New Version

```bash
npm version patch  # or minor, or major
git push && git push --tags
```

This will automatically trigger ECR build and npm publish workflows.

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

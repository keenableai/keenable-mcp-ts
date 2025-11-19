#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { AsyncLocalStorage } from 'async_hooks';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { tools, toolHandlers } from "./tools/index.js";
import type { AuthHeaders } from "./api.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf-8")
);

// AsyncLocalStorage to store auth headers per request
const authContext = new AsyncLocalStorage<AuthHeaders>();

// Helper function to get auth headers from context
export function getAuthHeaders(): AuthHeaders | undefined {
  return authContext.getStore();
}

const app = express();
app.use(cors());
app.use(express.json());

// Create the MCP server once (can be reused across requests)
const server = new McpServer(
  {
    name: packageJson.name,
    version: packageJson.version,
  }
);

// Register tools using the underlying server's request handlers
// This allows us to reuse existing tool definitions without converting to Zod
server.server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const handler = toolHandlers[name];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    const authHeaders = getAuthHeaders();
    return await handler(args, authHeaders);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Store transports for session management (optional - for stateful sessions)
const transports: Record<string, StreamableHTTPServerTransport> = {};

// Handle POST requests for client-to-server communication
app.post('/mcp', async (req, res) => {
  try {
    // Extract auth headers from the incoming request
    const authHeaders: AuthHeaders = {};
    
    // Check for X-API-Key header
    const apiKey = req.headers['x-api-key'] as string | undefined;
    if (apiKey) {
      authHeaders['X-API-Key'] = apiKey;
    }
    
    // Check for Authorization header
    const authorization = req.headers['authorization'] as string | undefined;
    if (authorization) {
      authHeaders['Authorization'] = authorization;
    }

    // Run the request handling within the auth context
    await authContext.run(authHeaders, async () => {
      // Check for existing session ID (optional for POST requests)
      // The mcp-session-id header is optional - the server supports both:
      // - Stateless mode: no session ID, each request is independent
      // - Stateful mode: with session ID, maintains session state
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        // Reuse existing transport for stateful sessions
        transport = transports[sessionId];
      } else if (!sessionId && req.body.method === 'initialize') {
        // New initialization request - could create stateful session here
        // For this implementation, we'll use stateless mode
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined, // Stateless mode
          enableJsonResponse: true,
          enableDnsRebindingProtection: false, // Set to true in production with proper hosts
        });
      } else {
        // Stateless mode for all other requests (no session ID required)
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined, // Stateless mode
          enableJsonResponse: true,
          enableDnsRebindingProtection: false, // Set to true in production with proper hosts
        });
      }

      // Clean up transport when request closes
      res.on('close', () => {
        transport.close();
        if (transport.sessionId && transports[transport.sessionId]) {
          delete transports[transport.sessionId];
        }
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    });

  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error'
        },
        id: null
      });
    }
  }
});

// Handle GET requests for server-to-client notifications via SSE (for stateful sessions)
// Note: mcp-session-id is REQUIRED for GET requests as SSE only works with stateful sessions
app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  try {
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error('Error handling MCP SSE request:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal server error');
    }
  }
});

// Handle DELETE requests for session termination
// Note: mcp-session-id is REQUIRED for DELETE requests to specify which session to terminate
app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  try {
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error('Error handling MCP session termination:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal server error');
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    server: packageJson.name,
    version: packageJson.version 
  });
});

const port = parseInt(process.env.PORT || '3000');
const host = process.env.HOST || 'localhost';

app.listen(port, host, () => {
  console.log(`MCP HTTP Server running on http://${host}:${port}/mcp`);
  console.log(`Health check available at http://${host}:${port}/health`);
  console.log('Server is running in stateless mode');
}).on('error', error => {
  console.error('Server error:', error);
  process.exit(1);
});

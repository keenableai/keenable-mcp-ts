#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getTools, getToolHandlers } from "./tools/index.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type { SearchModeConfig, SearchMode } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf-8")
);

// Export for use by other packages
export { getTools, getToolHandlers } from "./tools/index.js";
export { getSearchTool, createSearchHandler } from "./tools/search.js";
export type { ToolDefinition, ToolHandler, SearchModeConfig, SearchMode } from "./types.js";

const VALID_MODES = new Set<string>(['realtime', 'pro']);
const MODE_ALIASES: Record<string, SearchMode> = { standard: 'realtime' };

function parseSearchMode(envVar: string): SearchMode | undefined {
  const value = process.env[envVar];
  if (!value) return undefined;
  const resolved = MODE_ALIASES[value] ?? value;
  if (!VALID_MODES.has(resolved)) {
    console.error(`Invalid ${envVar}: "${value}". Valid values: realtime, pro`);
    return undefined;
  }
  return resolved as SearchMode;
}

const modeConfig: SearchModeConfig = {
  defaultSearchMode: parseSearchMode('KEENABLE_DEFAULT_SEARCH_MODE'),
  forcedSearchMode: parseSearchMode('KEENABLE_FORCED_SEARCH_MODE'),
};

const tools = getTools(modeConfig);
const toolHandlers = getToolHandlers(modeConfig);

const server = new Server(
  {
    name: packageJson.name,
    version: packageJson.version,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const handler = toolHandlers[name];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    return await handler(args);
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});

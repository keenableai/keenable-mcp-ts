#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// Example client demonstrating HTTP streamable mode usage
async function main() {
  const client = new Client({
    name: "example-http-client",
    version: "1.0.0"
  });

  try {
    // Connect to the HTTP server
    const transport = new StreamableHTTPClientTransport(
      new URL("http://localhost:3000/mcp")
    );
    
    await client.connect(transport);
    console.log("✅ Connected to MCP HTTP server");

    // List available tools
    const toolsList = await client.listTools();
    console.log("\n📋 Available tools:");
    toolsList.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    // Example: Search web pages
    console.log("\n🔍 Testing search_web_pages tool...");
    const searchResult = await client.callTool({
      name: "search_web_pages",
      arguments: { 
        query: "Model Context Protocol HTTP streaming", 
        count: 3 
      }
    });
    
    console.log("Search results:");
    const searchContent = searchResult.content as any[];
    console.log(searchContent[0]?.text || "No results");

    // Example: Fetch page content (if we have URLs from search)
    console.log("\n📄 Testing fetch_page_content tool...");
    const fetchResult = await client.callTool({
      name: "fetch_page_content",
      arguments: { 
        urls: ["https://github.com/modelcontextprotocol/typescript-sdk"] 
      }
    });
    
    console.log("Fetched content preview:");
    const fetchContent = fetchResult.content as any[];
    console.log((fetchContent[0]?.text || "").substring(0, 200) + "...");

    await client.close();
    console.log("\n✅ Connection closed");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as exampleClient };

#!/usr/bin/env node

import { spawn } from "child_process";
import { exampleClient } from "./http-client.js";

async function testHttpServer() {
  console.log("🚀 Starting MCP HTTP server for testing...");
  
  // Start the HTTP server
  const serverProcess = spawn("npm", ["run", "start:http"], {
    stdio: "pipe",
    shell: true
  });

  let serverOutput = "";
  serverProcess.stdout?.on("data", (data) => {
    const text = data.toString();
    serverOutput += text;
    if (text.includes("MCP HTTP Server running")) {
      console.log("✅ Server is ready");
      
      // Wait a moment for the server to fully start
      setTimeout(() => {
        runClientTests();
      }, 1000);
    }
  });

  serverProcess.stderr?.on("data", (data) => {
    console.error("Server error:", data.toString());
  });

  async function runClientTests() {
    try {
      console.log("\n🧪 Running client tests...");
      await exampleClient();
      console.log("\n✅ All tests completed successfully!");
    } catch (error) {
      console.error("\n❌ Tests failed:", error);
    } finally {
      // Clean up: stop the server
      serverProcess.kill();
      console.log("\n🛑 Server stopped");
      process.exit(0);
    }
  }

  // Handle process cleanup
  process.on("SIGINT", () => {
    serverProcess.kill();
    process.exit(0);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testHttpServer();
}

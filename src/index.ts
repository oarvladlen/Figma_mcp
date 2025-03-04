import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { FigmaMcpServer } from "./server";
import { getServerConfig } from "./config";
import express, { Request, Response } from "express";

// Create Express app instance that can be exported for serverless environments
export const app = express();
const config = getServerConfig();
const server = new FigmaMcpServer(config.figmaApiKey);

// Setup routes for the Express app
app.get("/sse", async (req: Request, res: Response) => {
  console.log("New SSE connection established");
  const sseTransport = server.createSseTransport(res);
  await server.connect(sseTransport);
});

app.post("/messages", async (req: Request, res: Response) => {
  await server.handleMessages(req, res);
});

app.get("/", (req: Request, res: Response) => {
  res.status(200).send("Figma MCP Server is running!");
});

export async function startServer(): Promise<void> {
  // Check if we're running in stdio mode (e.g., via CLI)
  const isStdioMode = process.env.NODE_ENV === "cli" || process.argv.includes("--stdio");

  if (isStdioMode) {
    console.log("Initializing Figma MCP Server in stdio mode...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } else {
    console.log(`Initializing Figma MCP Server in HTTP mode on port ${config.port}...`);
    // Start the server when not in serverless mode
    app.listen(config.port, () => {
      console.log(`HTTP server listening on port ${config.port}`);
      console.log(`SSE endpoint available at http://localhost:${config.port}/sse`);
      console.log(`Message endpoint available at http://localhost:${config.port}/messages`);
    });
  }

  console.log("\nAvailable tools:");
  console.log("- get_figma_data: Fetch Figma file information");
}

// If this file is being run directly, start the server
if (require.main === module) {
  startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}

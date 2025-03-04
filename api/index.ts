import { FigmaMcpServer } from "../src/server";
import { getServerConfig } from "../src/config";
import express, { Request, Response } from "express";

const app = express();
const config = getServerConfig();
const server = new FigmaMcpServer(config.figmaApiKey);

// Setup routes for the Express app
app.get("/api/sse", async (req: Request, res: Response) => {
  console.log("New SSE connection established");
  const sseTransport = server.createSseTransport(res);
  await server.connect(sseTransport);
});

app.post("/api/messages", async (req: Request, res: Response) => {
  await server.handleMessages(req, res);
});

app.get("/api", (req: Request, res: Response) => {
  res.status(200).send("Figma MCP Server is running!");
});

// Default route
app.get("*", (req: Request, res: Response) => {
  res.status(200).send("Figma MCP Server API - Use /api/sse for SSE connections and /api/messages for messages");
});

export default app; 
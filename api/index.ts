import { FigmaMcpServer } from "../src/server";
import { getServerConfig } from "../src/config";
import express from "express";
import { Response as ExpressResponse, Request as ExpressRequest } from "express";

// Define a more specific response type that includes the methods we use
interface TypedResponse extends ExpressResponse {
  status(code: number): TypedResponse;
  send(body: any): TypedResponse;
}

const app = express();
const config = getServerConfig();
const server = new FigmaMcpServer(config.figmaApiKey);

// Setup routes for the Express app
app.get("/api/sse", async (req: ExpressRequest, res: ExpressResponse) => {
  console.log("New SSE connection established");
  const sseTransport = server.createSseTransport(res);
  await server.connect(sseTransport);
});

app.post("/api/messages", async (req: ExpressRequest, res: ExpressResponse) => {
  await server.handleMessages(req, res);
});

app.get("/api", (req: ExpressRequest, res: TypedResponse) => {
  res.status(200).send("Figma MCP Server is running!");
});

// Default route
app.get("*", (req: ExpressRequest, res: TypedResponse) => {
  res.status(200).send("Figma MCP Server API - Use /api/sse for SSE connections and /api/messages for messages");
});

export default app; 
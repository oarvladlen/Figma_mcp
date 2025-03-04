import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FigmaService } from "./services/figma";
import express from "express";
import { Response as ExpressResponse, Request as ExpressRequest } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { IncomingMessage, ServerResponse } from "http";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { SimplifiedDesign } from "./services/simplify-node-response";

// Define a more specific response type that includes the methods we use
interface TypedResponse extends ExpressResponse {
  status(code: number): TypedResponse;
  send(body: any): TypedResponse;
  sendStatus(code: number): TypedResponse;
}

export class FigmaMcpServer {
  private readonly server: McpServer;
  private readonly figmaService: FigmaService;
  private sseTransport: SSEServerTransport | null = null;

  constructor(figmaApiKey: string) {
    this.figmaService = new FigmaService(figmaApiKey);
    this.server = new McpServer({
      name: "Figma MCP Server",
      version: "0.1.5",
    });

    this.registerTools();
  }

  private registerTools(): void {
    // Tool to get file information
    this.server.tool(
      "get_figma_data",
      "When the nodeId cannot be obtained, obtain the layout information about the entire Figma file",
      {
        fileKey: z
          .string()
          .describe(
            "The key of the Figma file to fetch, often found in a provided URL like figma.com/(file|design)/<fileKey>/...",
          ),
        nodeId: z
          .string()
          .optional()
          .describe(
            "The ID of the node to fetch, often found as URL parameter node-id=<nodeId>, always use if provided",
          ),
        depth: z
          .number()
          .optional()
          .describe(
            "How many levels deep to traverse the node tree, only use if explicitly requested by the user",
          ),
      },
      async ({ fileKey, nodeId, depth }) => {
        try {
          console.log(
            `Fetching ${
              depth ? `${depth} layers deep` : "all layers"
            } of ${nodeId ? `node ${nodeId} from file` : `full file`} ${fileKey} at depth: ${
              depth ?? "all layers"
            }`,
          );

          let file: SimplifiedDesign;
          if (nodeId) {
            file = await this.figmaService.getNode(fileKey, nodeId, depth);
          } else {
            file = await this.figmaService.getFile(fileKey, depth);
          }

          console.log(`Successfully fetched file: ${file.name}`);
          const { nodes, globalVars, ...metadata } = file;

          // Stringify each node individually to try to avoid max string length error with big files
          const nodesJson = `[${nodes.map((node) => JSON.stringify(node, null, 2)).join(",")}]`;
          const metadataJson = JSON.stringify(metadata, null, 2);
          const globalVarsJson = JSON.stringify(globalVars, null, 2);
          const resultJson = `{ "metadata": ${metadataJson}, "nodes": ${nodesJson}, "globalVars": ${globalVarsJson} }`;

          return {
            content: [{ type: "text", text: resultJson }],
          };
        } catch (error) {
          console.error(`Error fetching file ${fileKey}:`, error);
          return {
            content: [{ type: "text", text: `Error fetching file: ${error}` }],
          };
        }
      },
    );

    // Tool to download images
    this.server.tool(
      "download_figma_images",
      "Download SVG or PNG images used in a Figma file based on the IDs of image or icon nodes",
      {
        fileKey: z.string().describe("The key of the Figma file containing the node"),
        nodes: z
          .object({
            nodeId: z
              .string()
              .describe("The Figma ID of the node to fetch, formatted as 1234:5678"),
            fileName: z.string().describe("The local name for saving the fetched file"),
          })
          .array()
          .describe("The nodes to fetch as images"),
        localPath: z
          .string()
          .describe(
            "The absolute path to the directory where images are stored in the project. Automatically creates directories if needed.",
          ),
      },
      async ({ fileKey, nodes, localPath }) => {
        try {
          const downloads = nodes.map(({ nodeId, fileName }) => {
            console.log(`get image "${nodeId}", saving to: ${localPath}/${fileName}`);
            const fileType = fileName.endsWith(".svg") ? "svg" : "png";
            return this.figmaService.getImage(fileKey, nodeId, fileName, localPath, fileType);
          });

          // If any download fails, return false
          const saveSuccess = !(await Promise.all(downloads)).find((success) => !success);
          return {
            content: [{ type: "text", text: saveSuccess ? "Success" : "Failed" }],
          };
        } catch (error) {
          console.error(`Error downloading images from file ${fileKey}:`, error);
          return {
            content: [{ type: "text", text: `Error downloading images: ${error}` }],
          };
        }
      },
    );
  }

  async connect(transport: Transport): Promise<void> {
    await this.server.connect(transport);
  }

  // Create a new method to create SSE transport for serverless functions
  createSseTransport(res: ExpressResponse): SSEServerTransport {
    this.sseTransport = new SSEServerTransport(
      "/messages",
      res as unknown as ServerResponse<IncomingMessage>,
    );
    return this.sseTransport;
  }

  // Create a new method to handle messages for serverless functions
  async handleMessages(req: ExpressRequest, res: ExpressResponse): Promise<void> {
    if (!this.sseTransport) {
      (res as TypedResponse).status(400).send("No SSE connection established");
      return;
    }
    
    await this.sseTransport.handlePostMessage(
      req as unknown as IncomingMessage,
      res as unknown as ServerResponse<IncomingMessage>,
    );
  }

  async startHttpServer(port: number): Promise<void> {
    const app = express();

    app.get("/sse", async (req: ExpressRequest, res: ExpressResponse) => {
      console.log("New SSE connection established");
      this.sseTransport = new SSEServerTransport(
        "/messages",
        res as unknown as ServerResponse<IncomingMessage>,
      );
      await this.server.connect(this.sseTransport);
    });

    app.post("/messages", async (req: ExpressRequest, res: ExpressResponse) => {
      if (!this.sseTransport) {
        // Use type assertion to fix the TypeScript error
        (res as TypedResponse).sendStatus(400);
        return;
      }
      await this.sseTransport.handlePostMessage(
        req as unknown as IncomingMessage,
        res as unknown as ServerResponse<IncomingMessage>,
      );
    });

    app.listen(port, () => {
      console.log(`HTTP server listening on port ${port}`);
      console.log(`SSE endpoint available at http://localhost:${port}/sse`);
      console.log(`Message endpoint available at http://localhost:${port}/messages`);
    });
  }
}

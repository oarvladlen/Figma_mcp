declare module '@modelcontextprotocol/sdk/server/mcp.js' {
  export class McpServer {
    constructor(options: { name: string; version: string });
    connect(transport: any): Promise<void>;
    tool(name: string, description: string, params: any, handler: any): void;
  }
}

declare module '@modelcontextprotocol/sdk/server/stdio.js' {
  export class StdioServerTransport {
    constructor();
  }
}

declare module '@modelcontextprotocol/sdk/server/sse.js' {
  import { ServerResponse, IncomingMessage } from 'http';
  
  export class SSEServerTransport {
    constructor(path: string, res: ServerResponse);
    handlePostMessage(req: IncomingMessage, res: ServerResponse): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/shared/transport.js' {
  export interface Transport {
    // Add properties as needed
  }
}

declare module 'zod' {
  export function string(): any;
  export function number(): any;
  export function boolean(): any;
  export function array(schema: any): any;
  export function object(schema: any): any;
  export function optional(): any;
  
  export const z: {
    string(): any;
    number(): any;
    boolean(): any;
    array(schema: any): any;
    object(schema: any): any;
  };
} 
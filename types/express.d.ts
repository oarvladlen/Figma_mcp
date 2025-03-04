declare module 'express' {
  import { IncomingMessage, ServerResponse } from 'http';
  
  export interface Request extends IncomingMessage {
    // Add any request properties you use in your code
  }
  
  export interface Response extends ServerResponse {
    status(code: number): Response;
    send(body: any): Response;
    sendStatus(code: number): Response;
    // Add any other response methods you use
  }
  
  // Express application interface
  export interface Application {
    get(path: string, handler: (req: Request, res: Response) => void): Application;
    post(path: string, handler: (req: Request, res: Response) => void): Application;
    listen(port: number, callback?: () => void): any;
    // Add any other methods you use
  }
  
  // Express main function
  export default function express(): Application;
} 
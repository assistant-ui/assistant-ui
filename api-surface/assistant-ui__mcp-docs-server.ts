import { McpServer } from "@modelcontextprotocol/server";

declare const SERVER_VERSION: string;

declare namespace entry_root_exports {
  export { SERVER_VERSION, runServer, server };
}

declare function runServer(): Promise<void>;

declare const server: McpServer;

export { entry_root_exports as entry_root };

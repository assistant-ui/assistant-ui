import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

declare namespace entry_root_exports {
  export { runServer, server };
}

declare const server: McpServer;

declare function runServer(): Promise<void>;

export { entry_root_exports as entry_root };

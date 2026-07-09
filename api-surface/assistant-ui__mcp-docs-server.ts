import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

declare namespace entry_root_exports {
  export { runServer, server };
}

declare function runServer(): Promise<void>;

declare const server: McpServer;

export { entry_root_exports as entry_root };

import { McpServer } from "@modelcontextprotocol/server";

declare namespace entry_root_exports {
  export { runServer, server };
}

declare function runServer(): Promise<void>;

declare const server: McpServer;

export { entry_root_exports as entry_root };

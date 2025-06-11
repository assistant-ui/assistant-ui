import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { docsTools } from "./tools/docs.js";
import { examplesTools } from "./tools/examples.js";
import { logger } from "./utils/logger.js";
import { IS_PREPARE_MODE } from "./constants.js";

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf-8"),
);

export const server = new McpServer({
  name: "assistant-ui-docs",
  version: packageJson.version,
});

server.tool(
  docsTools.name,
  docsTools.description,
  docsTools.parameters,
  docsTools.execute,
);
server.tool(
  examplesTools.name,
  examplesTools.description,
  examplesTools.parameters,
  examplesTools.execute,
);

export async function runServer() {
  try {
    if (IS_PREPARE_MODE) {
      logger.info("Running in preparation mode...");
      process.exit(0);
    }

    logger.info(
      `Starting assistant-ui MCP docs server v${packageJson.version}`,
    );
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    logger.error("Failed to start MCP server", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void runServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}

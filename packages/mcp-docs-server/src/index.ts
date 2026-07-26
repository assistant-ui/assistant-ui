import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { docsTools } from "./tools/docs.js";
import { examplesTools } from "./tools/examples.js";
import { searchTools } from "./tools/search.js";
import {
  xuluxTemplatesListTool,
  xuluxTemplateDetailsTool,
  xuluxTemplatePreviewTool,
} from "./tools/xulux-templates.js";
import { xuluxPlaygroundPrompt } from "./prompts/xulux-playground.js";
import { registerResources } from "./tools/resources.js";
import { logger } from "./utils/logger.js";
import { PACKAGE_DIR } from "./constants.js";

import { readFileSync } from "node:fs";
import { join } from "node:path";

const packageJson = JSON.parse(
  readFileSync(join(PACKAGE_DIR, "package.json"), "utf-8"),
);

export const server = new McpServer({
  name: "assistant-ui-docs",
  version: packageJson.version,
});

server.registerTool(
  docsTools.name,
  {
    title: "assistant-ui Documentation",
    description: docsTools.description,
    inputSchema: docsTools.parameters,
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  docsTools.execute,
);
server.registerTool(
  examplesTools.name,
  {
    title: "assistant-ui Examples",
    description: examplesTools.description,
    inputSchema: examplesTools.parameters,
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  examplesTools.execute,
);
server.registerTool(
  searchTools.name,
  {
    title: "Search assistant-ui Documentation",
    description: searchTools.description,
    inputSchema: searchTools.parameters,
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  searchTools.execute,
);

server.registerTool(
  xuluxTemplatesListTool.name,
  {
    title: "assistant-ui Templates",
    description: xuluxTemplatesListTool.description,
    inputSchema: xuluxTemplatesListTool.parameters,
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  xuluxTemplatesListTool.execute,
);
server.registerTool(
  xuluxTemplateDetailsTool.name,
  {
    title: "assistant-ui Template Details",
    description: xuluxTemplateDetailsTool.description,
    inputSchema: xuluxTemplateDetailsTool.parameters,
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  xuluxTemplateDetailsTool.execute,
);
server.registerTool(
  xuluxTemplatePreviewTool.name,
  {
    title: "assistant-ui Template Preview URLs",
    description: xuluxTemplatePreviewTool.description,
    inputSchema: xuluxTemplatePreviewTool.parameters,
    annotations: { readOnlyHint: false, openWorldHint: true },
  },
  xuluxTemplatePreviewTool.execute,
);

server.registerPrompt(
  xuluxPlaygroundPrompt.name,
  {
    title: "assistant-ui Template Workflow",
    description: xuluxPlaygroundPrompt.description,
  },
  () => ({
    messages: [
      {
        role: "user" as const,
        content: { type: "text" as const, text: xuluxPlaygroundPrompt.text },
      },
    ],
  }),
);

registerResources(server);

export async function runServer() {
  try {
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

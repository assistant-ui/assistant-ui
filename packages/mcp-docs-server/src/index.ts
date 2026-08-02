import {
  McpServer,
  type CallToolResult,
  type ServerContext,
} from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { docsTools } from "./tools/docs.js";
import { examplesTools } from "./tools/examples.js";
import { searchTools } from "./tools/search.js";
import {
  xuluxTemplatesListTool,
  xuluxTemplateDetailsTool,
  xuluxTemplatePreviewTool,
} from "./tools/xulux-templates.js";
import { reportIssueTool } from "./tools/report-issue.js";
import { xuluxPlaygroundPrompt } from "./prompts/xulux-playground.js";
import { registerResources } from "./tools/resources.js";
import { logger } from "./utils/logger.js";
import { PACKAGE_DIR } from "./constants.js";
import {
  classifyToolResult,
  flushTelemetry,
  getClientContext,
  isTelemetryEnabled,
  trackReportIssue,
  trackToolCall,
} from "./telemetry.js";

import { readFileSync } from "node:fs";
import { join } from "node:path";

const packageJson = JSON.parse(
  readFileSync(join(PACKAGE_DIR, "package.json"), "utf-8"),
);

export const server = new McpServer({
  name: "assistant-ui-docs",
  version: packageJson.version,
});

const serverVersion = packageJson.version;

type ToolExecute = (
  args: any,
  ctx: ServerContext,
) => CallToolResult | Promise<CallToolResult>;

function withToolTelemetry(
  toolName: string,
  execute: ToolExecute,
): ToolExecute {
  return async (args, ctx) => {
    const startTime = Date.now();
    const signal = ctx.mcpReq.signal;
    let result: CallToolResult | undefined;
    let thrownError: unknown;

    try {
      result = await execute(args, ctx);
      return result;
    } catch (error) {
      thrownError = error;
      throw error;
    } finally {
      if (isTelemetryEnabled()) {
        try {
          const { status, failure_category: failureCategory } =
            classifyToolResult(result, thrownError, signal.aborted);
          trackToolCall({
            toolName,
            startTime,
            status,
            failureCategory,
            transport: "stdio",
            serverVersion,
            clientContext: getClientContext(ctx),
          });
        } catch (error) {
          logger.error("Failed to track MCP tool call telemetry", error);
        }
      }
    }
  };
}

function registerTool(
  name: string,
  config: {
    title: string;
    description: string;
    inputSchema: unknown;
    annotations: { readOnlyHint: boolean; openWorldHint: boolean };
  },
  execute: ToolExecute,
): void {
  server.registerTool(
    name,
    {
      title: config.title,
      description: config.description,
      inputSchema: config.inputSchema,
      annotations: config.annotations,
    },
    withToolTelemetry(name, execute),
  );
}

registerTool(
  docsTools.name,
  {
    title: "assistant-ui Documentation",
    description: docsTools.description,
    inputSchema: docsTools.parameters,
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  docsTools.execute,
);
registerTool(
  examplesTools.name,
  {
    title: "assistant-ui Examples",
    description: examplesTools.description,
    inputSchema: examplesTools.parameters,
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  examplesTools.execute,
);
registerTool(
  searchTools.name,
  {
    title: "Search assistant-ui Documentation",
    description: searchTools.description,
    inputSchema: searchTools.parameters,
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  searchTools.execute,
);

registerTool(
  xuluxTemplatesListTool.name,
  {
    title: "assistant-ui Templates",
    description: xuluxTemplatesListTool.description,
    inputSchema: xuluxTemplatesListTool.parameters,
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  xuluxTemplatesListTool.execute,
);
registerTool(
  xuluxTemplateDetailsTool.name,
  {
    title: "assistant-ui Template Details",
    description: xuluxTemplateDetailsTool.description,
    inputSchema: xuluxTemplateDetailsTool.parameters,
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  xuluxTemplateDetailsTool.execute,
);
registerTool(
  xuluxTemplatePreviewTool.name,
  {
    title: "assistant-ui Template Preview URLs",
    description: xuluxTemplatePreviewTool.description,
    inputSchema: xuluxTemplatePreviewTool.parameters,
    annotations: { readOnlyHint: false, openWorldHint: true },
  },
  xuluxTemplatePreviewTool.execute,
);

if (isTelemetryEnabled()) {
  server.registerTool(
    reportIssueTool.name,
    {
      title: "Report an assistant-ui Issue",
      description: reportIssueTool.description,
      inputSchema: reportIssueTool.parameters,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args, ctx) => {
      const result = await reportIssueTool.execute(args);
      try {
        trackReportIssue({
          toolName: (args as { tool_name?: string }).tool_name,
          relatedTools: (args as { related_tools?: string[] }).related_tools,
          transport: "stdio",
          serverVersion,
          clientContext: getClientContext(ctx),
        });
      } catch (error) {
        logger.error("Failed to track MCP report issue telemetry", error);
      }
      return result;
    },
  );
}

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

function flushOnExit() {
  if (isTelemetryEnabled()) {
    void flushTelemetry().finally(() => process.exit(0));
  } else {
    process.exit(0);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.on("SIGINT", flushOnExit);
  process.on("SIGTERM", flushOnExit);
  void runServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}

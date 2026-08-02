import {
  McpServer,
  type CallToolResult,
  type ServerContext,
} from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import type { ZodType } from "zod";
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
import {
  classifyToolResult,
  getClientContext,
  isTelemetryEnabled,
  trackToolCall,
} from "./telemetry.js";

import { SERVER_VERSION } from "./version.js";

export const server = new McpServer({
  name: "assistant-ui-docs",
  version: SERVER_VERSION,
});

const serverVersion = SERVER_VERSION;
export { SERVER_VERSION };

type Tool<TArgs> = {
  name: string;
  description: string;
  parameters: ZodType<TArgs>;
  execute: (
    args: TArgs,
    ctx: ServerContext,
  ) => CallToolResult | Promise<CallToolResult>;
};

function withToolTelemetry<TArgs>(
  toolName: string,
  execute: Tool<TArgs>["execute"],
): Tool<TArgs>["execute"] {
  return async (args, ctx) => {
    const startTime = Date.now();
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
          const signal = ctx.mcpReq.signal;
          const { status, failure_category: failureCategory } =
            classifyToolResult(result, thrownError, signal?.aborted === true);
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

function registerTool<TArgs>(
  tool: Tool<TArgs>,
  config: {
    title: string;
    annotations: { readOnlyHint: boolean; openWorldHint: boolean };
  },
): void {
  server.registerTool(
    tool.name,
    {
      title: config.title,
      description: tool.description,
      inputSchema: tool.parameters,
      annotations: config.annotations,
    },
    withToolTelemetry(tool.name, tool.execute),
  );
}

registerTool(docsTools, {
  title: "assistant-ui Documentation",
  annotations: { readOnlyHint: true, openWorldHint: false },
});
registerTool(examplesTools, {
  title: "assistant-ui Examples",
  annotations: { readOnlyHint: true, openWorldHint: false },
});
registerTool(searchTools, {
  title: "Search assistant-ui Documentation",
  annotations: { readOnlyHint: true, openWorldHint: false },
});

registerTool(xuluxTemplatesListTool, {
  title: "assistant-ui Templates",
  annotations: { readOnlyHint: true, openWorldHint: true },
});
registerTool(xuluxTemplateDetailsTool, {
  title: "assistant-ui Template Details",
  annotations: { readOnlyHint: true, openWorldHint: true },
});
registerTool(xuluxTemplatePreviewTool, {
  title: "assistant-ui Template Preview URLs",
  annotations: { readOnlyHint: false, openWorldHint: true },
});

registerTool(reportIssueTool, {
  title: "Report an assistant-ui Issue",
  annotations: { readOnlyHint: true, openWorldHint: false },
});

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

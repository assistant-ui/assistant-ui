import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import {
  JSONSchema7,
  ToolSet,
  streamText,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { experimental_createMCPClient as createMCPClient } from "@ai-sdk/mcp";

export const maxDuration = 30;

let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;
let cachedMCPTools: ToolSet | null = null;

async function getMCPTools(): Promise<ToolSet> {
  if (cachedMCPTools) return cachedMCPTools;

  try {
    mcpClient = await createMCPClient({
      // TODO adjust this to point to your MCP server URL
      transport: {
        type: "http",
        url: "http://localhost:8000/mcp",
      },
    });
    cachedMCPTools = await mcpClient.tools();
    return cachedMCPTools;
  } catch (e) {
    console.warn("Failed to connect to MCP server:", e);
    mcpClient = null;
    return {};
  }
}

export async function POST(req: Request) {
  const {
    messages,
    system,
    tools,
  }: {
    messages: UIMessage[];
    system?: string;
    tools?: Record<string, { description?: string; parameters: JSONSchema7 }>;
  } = await req.json();

  const mcpTools = await getMCPTools();

  const result = streamText({
    model: openai.responses("gpt-5-nano"),
    messages: await convertToModelMessages(messages),
    system,
    tools: {
      ...mcpTools,
      ...frontendTools(tools ?? {}),
      // add backend tools here
    },
    providerOptions: {
      openai: {
        reasoningEffort: "low",
        reasoningSummary: "auto",
      },
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
  });
}

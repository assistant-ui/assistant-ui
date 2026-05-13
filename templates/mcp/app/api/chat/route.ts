import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import {
  type JSONSchema7,
  type ToolSet,
  streamText,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { getMcpClient } from "../mcp-client";

export const maxDuration = 30;

let cachedMCPTools: ToolSet | null = null;

async function getMCPTools(): Promise<ToolSet> {
  if (cachedMCPTools) return cachedMCPTools;
  try {
    const client = await getMcpClient();
    cachedMCPTools = await client.tools();
    return cachedMCPTools;
  } catch (e) {
    console.warn("Failed to connect to MCP server:", e);
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

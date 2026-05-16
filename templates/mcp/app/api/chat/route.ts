import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import {
  type JSONSchema7,
  type ToolSet,
  streamText,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { getMcpTools } from "../mcp-client";

export const maxDuration = 30;

async function getMCPTools(): Promise<ToolSet> {
  try {
    return await getMcpTools();
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
    model: openai.responses("gpt-5.4-nano"),
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

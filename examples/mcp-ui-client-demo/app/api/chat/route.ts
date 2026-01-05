import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, UIMessage, stepCountIs } from "ai";
import { createNativeMCPClient } from "@/lib/mcp-client-native";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a helpful weather assistant. You can check the weather for any location using the get_weather tool, or compare weather between two locations using the compare_weather tool.

When a user asks about weather:
1. Use get_weather for a single location
2. Use compare_weather when comparing two places

Always provide helpful commentary about the weather after displaying it.`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Create MCP client and get tools using native SDK (bypasses @ai-sdk/mcp race condition)
  let mcpClient: Awaited<ReturnType<typeof createNativeMCPClient>> | null =
    null;
  let tools: Record<string, unknown> = {};

  try {
    mcpClient = await createNativeMCPClient();
    tools = mcpClient.tools();
    console.log(`[MCP Native] Loaded ${Object.keys(tools).length} tools`);
    // Debug: log tool structure
    for (const [name, t] of Object.entries(tools)) {
      const tool = t as { inputSchema?: { jsonSchema?: unknown } };
      console.log(
        `[MCP Native] Tool ${name} inputSchema:`,
        JSON.stringify(tool.inputSchema?.jsonSchema),
      );
    }
  } catch (error) {
    console.error("[MCP Native] Failed to connect:", error);
    // Continue without MCP tools - will respond that weather is unavailable
  }

  // Select model based on environment
  const model = process.env["ANTHROPIC_API_KEY"]
    ? anthropic("claude-sonnet-4-5")
    : openai("gpt-5.2");

  // Build streamText options conditionally
  const streamOptions: any = {
    model,
    system: SYSTEM_PROMPT,
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
  };

  if (Object.keys(tools).length > 0) {
    streamOptions.tools = tools as Parameters<typeof streamText>[0]["tools"];
  }

  const result = streamText({
    ...streamOptions,
    onFinish: async () => {
      await mcpClient?.close();
    },
  });

  return result.toUIMessageStreamResponse();
}

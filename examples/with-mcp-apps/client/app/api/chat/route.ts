import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, UIMessage, stepCountIs } from "ai";
import { createMultiServerMCPClient } from "@/lib/mcp-client-native";
import { getDefaultEnabledServers } from "@/lib/server-config";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a helpful assistant with access to various tools. When a user asks for something, use the appropriate tool to help them.

Available capabilities depend on enabled MCP servers. Always provide helpful commentary after displaying tool results.`;

export async function POST(req: Request) {
  const {
    messages,
    enabledServers,
  }: { messages: UIMessage[]; enabledServers?: string[] } = await req.json();

  // Use provided enabled servers or fall back to defaults
  const serverIds = enabledServers ?? getDefaultEnabledServers();

  console.log("[MCP] Request enabledServers:", enabledServers);
  console.log("[MCP] Using serverIds:", serverIds);

  let mcpClient: Awaited<ReturnType<typeof createMultiServerMCPClient>> | null =
    null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tools: any = {};

  try {
    mcpClient = await createMultiServerMCPClient(serverIds);
    tools = mcpClient.tools();
    console.log(
      `[MCP] Loaded ${Object.keys(tools).length} tools from ${serverIds.length} server(s)`,
    );
  } catch (error) {
    console.error("[MCP] Failed to connect:", error);
  }

  const model = process.env["ANTHROPIC_API_KEY"]
    ? anthropic("claude-sonnet-4-5")
    : openai("gpt-4o");

  const hasTools = tools && Object.keys(tools).length > 0;

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(hasTools ? { tools: tools as any } : {}),
    onFinish: async () => {
      await mcpClient?.close();
    },
  });

  return result.toUIMessageStreamResponse();
}

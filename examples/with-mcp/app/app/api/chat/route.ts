import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { convertToModelMessages, streamText } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, system, tools } = await req.json();
  const result = streamText({
    model: openai("gpt-5.4-nano"),
    messages: await convertToModelMessages(messages),
    system,
    // Forward frontend-defined tools (including MCP tools auto-registered
    // by McpManagerResource) to the model. The model calls them, the
    // tool-call event streams back to the frontend, and the McpManager's
    // toolkit `execute` dispatches to the right MCP server.
    tools: { ...frontendTools(tools) },
  });
  return result.toUIMessageStreamResponse();
}

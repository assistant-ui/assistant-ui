import { openai } from "@ai-sdk/openai";
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  experimental_createMCPClient as createMCPClient,
} from "ai";

// Create MCP client to connect to your MCP server
const mcpClient = await createMCPClient({
  // TODO: Adjust this to point to your MCP server URL
  transport: {
    type: "sse",
    url: "http://localhost:8000/sse",
  },
});

// Get available tools from the MCP server
const mcpTools = await mcpClient.tools();

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    messages: convertToModelMessages(messages),
    // Include MCP tools in the available tools
    tools: mcpTools,
  });

  return result.toUIMessageStreamResponse();
}

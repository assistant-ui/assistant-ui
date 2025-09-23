import { openai } from "@ai-sdk/openai";
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  experimental_createMCPClient as createMCPClient,
} from "ai";

let mcpClient: any;
let mcpTools: any;

// Initialize MCP client lazily
async function initMCP() {
  if (!mcpClient) {
    try {
      // Create MCP client to connect to your MCP server
      mcpClient = await createMCPClient({
        // TODO: Adjust this to point to your MCP server URL
        transport: {
          type: "sse",
          url: process.env.MCP_SERVER_URL || "http://localhost:8000/sse",
        },
      });
      
      // Get available tools from the MCP server
      mcpTools = await mcpClient.tools();
    } catch (error) {
      console.error("Failed to connect to MCP server:", error);
      mcpTools = {}; // Fallback to empty tools
    }
  }
  return mcpTools;
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Initialize MCP connection on first request
  const tools = await initMCP();

  const result = streamText({
    model: openai("gpt-4o"),
    messages: convertToModelMessages(messages),
    // Include MCP tools in the available tools
    tools,
  });

  return result.toUIMessageStreamResponse();
}

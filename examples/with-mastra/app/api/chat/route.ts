import { mastra } from "@/mastra";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages, threadId, agentId = "chefAgent" } = await req.json();

    // Get the specified agent
    const agent = mastra.getAgent(agentId);

    // Create stream with agent
    const result = await agent.stream(messages, { threadId });

    // Return the stream as a data stream response
    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
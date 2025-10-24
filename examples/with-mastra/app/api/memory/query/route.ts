import { memory } from "@/mastra/memory";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { threadId, resourceId, query: searchQuery } = await req.json();

    if (!threadId) {
      return new Response(JSON.stringify({ error: "threadId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const queryOptions: any = {
      threadId,
      ...(resourceId && { resourceId }),
    };

    // If search query is provided, use semantic search
    if (searchQuery) {
      queryOptions.selectBy = {
        vectorSearchString: searchQuery,
      };
    }

    const { uiMessages } = await memory.query(queryOptions);

    // Transform to MastraMemoryResult format expected by the hook
    const results = uiMessages.map((msg: any) => ({
      content:
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content),
      metadata: msg.metadata || {},
      similarity: msg.similarity || 0,
      threadId: msg.threadId || threadId,
      timestamp:
        typeof msg.createdAt === "string"
          ? msg.createdAt
          : msg.createdAt?.toISOString?.() || new Date().toISOString(),
    }));

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Memory query error:", error);
    return new Response(JSON.stringify({ error: "Failed to query memory" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

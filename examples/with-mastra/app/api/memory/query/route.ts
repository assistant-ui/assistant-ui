import { memory } from "@/mastra/memory";
import { NextRequest, NextResponse } from "next/server";

type MemoryMessage = {
  content?: unknown;
  metadata?: Record<string, unknown>;
  threadId?: string;
  createdAt?: Date | string;
};

const messageContent = (content: unknown) => {
  if (typeof content === "string") return content;
  if (content == null) return "";
  return JSON.stringify(content);
};

const messageTimestamp = (createdAt: Date | string | undefined) => {
  if (createdAt instanceof Date) return createdAt.toISOString();
  if (typeof createdAt === "string") return new Date(createdAt).toISOString();
  return new Date().toISOString();
};

export async function POST(req: NextRequest) {
  try {
    const { threadId, resourceId, query: searchQuery } = await req.json();

    if (!threadId) {
      return NextResponse.json(
        { error: "threadId is required" },
        { status: 400 },
      );
    }

    if (searchQuery && resourceId) {
      try {
        const { results } = await memory.searchMessages({
          query: searchQuery,
          resourceId,
          topK: 10,
          filter: { threadId },
        });

        return NextResponse.json({
          results: results.map((result) => ({
            content: result.text ?? "",
            metadata: {
              ...(result.groupId && { groupId: result.groupId }),
              ...(result.range && { range: result.range }),
            },
            similarity: result.score,
            threadId: result.threadId,
            timestamp:
              result.observedAt?.toISOString() ?? new Date().toISOString(),
          })),
        });
      } catch {
        // Fall through to recent-message recall when vector retrieval is not configured.
      }
    }

    const { messages } = await memory.recall({
      threadId,
      ...(resourceId && { resourceId }),
      perPage: 10,
    });

    return NextResponse.json({
      results: (messages as MemoryMessage[]).map((message) => ({
        content: messageContent(message.content),
        metadata: message.metadata ?? {},
        similarity: 0,
        threadId: message.threadId ?? threadId,
        timestamp: messageTimestamp(message.createdAt),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to query memory",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

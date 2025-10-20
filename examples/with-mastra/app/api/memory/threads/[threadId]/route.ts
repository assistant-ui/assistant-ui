import { memory } from "@/mastra/memory";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await params;

    if (!threadId) {
      return new Response(JSON.stringify({ error: "threadId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const thread = await memory.getThreadById({ threadId });

    if (!thread) {
      return new Response(JSON.stringify({ error: "Thread not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get messages for the thread
    const { uiMessages } = await memory.query({
      threadId: thread.id,
    });

    return new Response(
      JSON.stringify({
        thread: {
          ...thread,
          messages: uiMessages,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Get thread error:", error);
    return new Response(JSON.stringify({ error: "Failed to get thread" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await params;
    const { title, metadata } = await req.json();

    if (!threadId) {
      return new Response(JSON.stringify({ error: "threadId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // First get the existing thread to preserve other fields
    const existingThread = await memory.getThreadById({ threadId });

    if (!existingThread) {
      return new Response(JSON.stringify({ error: "Thread not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    await memory.updateThread({
      id: threadId,
      title: title || existingThread.title,
      metadata: metadata || existingThread.metadata,
    });

    const updatedThread = await memory.getThreadById({ threadId });

    return new Response(JSON.stringify({ thread: updatedThread }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Update thread error:", error);
    return new Response(JSON.stringify({ error: "Failed to update thread" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

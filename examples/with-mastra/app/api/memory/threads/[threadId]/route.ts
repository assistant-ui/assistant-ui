import { memory } from "@/mastra/memory";
import { NextRequest, NextResponse } from "next/server";

const getResourceId = (req: NextRequest) =>
  req.nextUrl.searchParams.get("resourceId") ?? undefined;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await params;
    const resourceId = getResourceId(req);

    if (!threadId) {
      return NextResponse.json(
        { error: "threadId is required" },
        { status: 400 },
      );
    }

    const thread = await memory.getThreadById({
      threadId,
      ...(resourceId && { resourceId }),
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const { messages } = await memory.recall({
      threadId: thread.id,
      ...(resourceId && { resourceId }),
      perPage: false,
    });

    return NextResponse.json({
      thread: {
        ...thread,
        messages,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to get thread",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await params;
    const resourceId = getResourceId(req);
    const { title, metadata } = await req.json();

    if (!threadId) {
      return NextResponse.json(
        { error: "threadId is required" },
        { status: 400 },
      );
    }

    const existingThread = await memory.getThreadById({
      threadId,
      ...(resourceId && { resourceId }),
    });

    if (!existingThread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const updatedThread = await memory.updateThread({
      id: threadId,
      title: title ?? existingThread.title,
      metadata: metadata ?? existingThread.metadata ?? {},
    });

    return NextResponse.json({ thread: updatedThread });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to update thread",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await params;
    const resourceId = getResourceId(req);

    if (!threadId) {
      return NextResponse.json(
        { error: "threadId is required" },
        { status: 400 },
      );
    }

    const existingThread = await memory.getThreadById({
      threadId,
      ...(resourceId && { resourceId }),
    });

    if (!existingThread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    await memory.deleteThread(threadId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to delete thread",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

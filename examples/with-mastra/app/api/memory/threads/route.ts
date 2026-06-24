import { memory } from "@/mastra/memory";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const resourceId = req.nextUrl.searchParams.get("resourceId");

    if (!resourceId) {
      return NextResponse.json(
        { error: "resourceId is required" },
        { status: 400 },
      );
    }

    const threads = await memory.listThreads({
      filter: { resourceId },
      perPage: false,
    });

    return NextResponse.json({ threads: threads.threads });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to list threads",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { threadId, resourceId, title, metadata } = await req.json();

    if (!resourceId) {
      return NextResponse.json(
        { error: "resourceId is required" },
        { status: 400 },
      );
    }

    const thread = await memory.createThread({
      ...(threadId && { threadId }),
      resourceId,
      ...(title && { title }),
      ...(metadata && { metadata }),
    });

    return NextResponse.json({ thread }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to create thread",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

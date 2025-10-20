import { memory } from "@/mastra/memory";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const resourceId = searchParams.get("resourceId");

    if (!resourceId) {
      return new Response(JSON.stringify({ error: "resourceId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const threads = await memory.getThreadsByResourceId({ resourceId });

    return new Response(JSON.stringify({ threads }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("List threads error:", error);
    return new Response(JSON.stringify({ error: "Failed to list threads" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { threadId, resourceId, title, metadata } = await req.json();

    if (!resourceId) {
      return new Response(JSON.stringify({ error: "resourceId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const thread = await memory.createThread({
      ...(threadId && { threadId }),
      resourceId,
      ...(title && { title }),
      ...(metadata && { metadata }),
    });

    return new Response(JSON.stringify({ thread }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Create thread error:", error);
    return new Response(JSON.stringify({ error: "Failed to create thread" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

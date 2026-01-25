/**
 * SSE streaming route for task events.
 * Clients connect here to receive real-time task updates.
 */

import { NextRequest } from "next/server";
import { taskStore } from "../store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const taskId = request.nextUrl.searchParams.get("taskId");

  if (!taskId) {
    return new Response("Missing taskId parameter", { status: 400 });
  }

  const controller = taskStore.get(taskId);
  if (!controller) {
    return new Response("Task not found", { status: 404 });
  }

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    async start(streamController) {
      const encoder = new TextEncoder();

      try {
        for await (const event of controller.events()) {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          streamController.enqueue(encoder.encode(data));
        }

        // Send done marker
        streamController.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        console.error("Stream error:", error);
        const errorData = `data: ${JSON.stringify({
          type: "task_failed",
          taskId,
          data: {
            reason: error instanceof Error ? error.message : "Stream error",
          },
          timestamp: new Date(),
        })}\n\n`;
        streamController.enqueue(encoder.encode(errorData));
      } finally {
        streamController.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

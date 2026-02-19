/**
 * SSE streaming route for task events.
 * Clients connect here to receive real-time task updates.
 *
 * Limitations (demo-quality, not production-ready):
 * - In-memory only: Events only exist while the server process is alive.
 * - Bounded replay: A fixed-size in-memory history is used for replay.
 *   Reconnecting with stale Last-Event-ID values beyond that window can miss data.
 *
 * For production use, consider adding event history with replay (e.g. via
 * durable storage), backpressure handling, and a proper pub/sub system.
 */

import { NextRequest } from "next/server";
import { taskStore } from "../store";
import { logger } from "../logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const taskId = request.nextUrl.searchParams.get("taskId");
  const lastEventIdHeader = request.headers.get("last-event-id");
  const parsedLastEventId = Number.parseInt(lastEventIdHeader ?? "", 10);
  const lastEventId = Number.isFinite(parsedLastEventId)
    ? parsedLastEventId
    : 0;

  if (!taskId) {
    logger.warn("stream", "Missing taskId parameter");
    return new Response("Missing taskId parameter", { status: 400 });
  }

  logger.info("stream", "New stream connection", { taskId, lastEventId });

  const controller = taskStore.get(taskId);
  if (!controller) {
    logger.error("stream", "Task not found", { taskId });
    return new Response("Task not found", { status: 404 });
  }

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    async start(streamController) {
      const encoder = new TextEncoder();

      // Heartbeat to keep connection alive through proxies/load balancers
      const heartbeat = setInterval(() => {
        try {
          streamController.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          // Stream may have been closed
          clearInterval(heartbeat);
        }
      }, 30000);

      try {
        let eventsSent = 0;
        for await (const { id, event } of controller.events(lastEventId)) {
          const data = `id: ${id}\ndata: ${JSON.stringify(event)}\n\n`;
          streamController.enqueue(encoder.encode(data));
          eventsSent++;
        }

        logger.info("stream", "Stream completed", { taskId, eventsSent });
        streamController.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        logger.error("stream", "Stream error", {
          taskId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
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
        clearInterval(heartbeat);
        logger.debug("stream", "Stream closed", { taskId });
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

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
import { getTaskController } from "../store";
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

  const controller = getTaskController(taskId);
  if (!controller) {
    logger.error("stream", "Task not found", { taskId });
    return new Response("Task not found", { status: 404 });
  }

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    async start(streamController) {
      const encoder = new TextEncoder();
      let streamClosed = false;
      let requestAborted = request.signal.aborted;
      const iterator = controller.events(lastEventId)[Symbol.asyncIterator]();
      const closeStream = () => {
        if (streamClosed) return;
        streamClosed = true;
        try {
          streamController.close();
        } catch {
          // Stream was already cancelled by the client.
        }
      };
      const handleAbort = () => {
        requestAborted = true;
      };
      request.signal.addEventListener("abort", handleAbort);

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
        while (!requestAborted) {
          const next = await iterator.next();
          if (next.done) {
            break;
          }
          const { id, event } = next.value;
          const data = `id: ${id}\ndata: ${JSON.stringify(event)}\n\n`;
          streamController.enqueue(encoder.encode(data));
          eventsSent++;
        }

        if (!requestAborted) {
          logger.info("stream", "Stream completed", { taskId, eventsSent });
          streamController.enqueue(encoder.encode("data: [DONE]\n\n"));
        }
      } catch (error) {
        if (!requestAborted) {
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
        }
      } finally {
        clearInterval(heartbeat);
        request.signal.removeEventListener("abort", handleAbort);
        await iterator.return?.(undefined);
        logger.debug("stream", "Stream closed", { taskId });
        closeStream();
      }
    },
    cancel() {
      // `request.signal` is not guaranteed to fire before stream cancellation.
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

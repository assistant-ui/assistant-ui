import type { NextRequest } from "next/server";
import { piClient } from "@/lib/pi-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ threadId: string }> };

/**
 * SSE stream of `PiClientEvent`s for one thread. The supervisor sends a
 * `snapshot` first, then live events. A client disconnect unsubscribes but does
 * NOT abort the Pi run (PI_MVP_PLAN "Reconnect" — disconnect ≠ abort).
 */
export async function GET(req: NextRequest, { params }: Context) {
  const { threadId } = await params;
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Controller already closed (client gone); drop.
        }
      };

      // Flush headers through any buffering proxy immediately.
      write(": connected\n\n");

      unsubscribe = piClient.subscribe(threadId, (event) => {
        write(`data: ${JSON.stringify(event)}\n\n`);
      });

      req.signal.addEventListener("abort", () => {
        unsubscribe?.();
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      });
    },
    cancel() {
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}

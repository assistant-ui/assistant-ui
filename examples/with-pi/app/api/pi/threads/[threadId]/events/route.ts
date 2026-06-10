import type { NextRequest } from "next/server";
import { piClient } from "@/lib/pi-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ threadId: string }> };

/**
 * SSE stream of `PiClientEvent`s for one thread. Snapshot-first by default;
 * `?snapshot=false` lets a client that already called `GET /threads/:id` attach
 * only to subsequent live events. A client disconnect unsubscribes but does NOT
 * abort the Pi run — disconnect ≠ abort.
 */
export async function GET(req: NextRequest, { params }: Context) {
  const { threadId } = await params;
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();

  const write = (chunk: string) => {
    void writer.write(encoder.encode(chunk)).catch(() => {
      // Writer already closed (client gone); drop.
    });
  };

  const cleanup = () => {
    unsubscribe?.();
    if (heartbeat) clearInterval(heartbeat);
    void writer.close().catch(() => {
      // Already closed.
    });
  };

  // Flush headers through any buffering proxy immediately.
  write(": connected\n\n");
  heartbeat = setInterval(() => write(": ping\n\n"), 2000);
  unsubscribe = piClient.subscribe(
    threadId,
    (event) => {
      write(`data: ${JSON.stringify(event)}\n\n`);
    },
    { includeSnapshot: req.nextUrl.searchParams.get("snapshot") !== "false" },
  );
  req.signal.addEventListener("abort", cleanup, { once: true });

  return new Response(stream.readable, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}

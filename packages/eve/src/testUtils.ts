import { ClientSession, type MessageStreamEvent } from "eve/client";
import { vi } from "vitest";

export const createEveSessionFixture = ({
  events = [],
  tailIndex = events.length - 1,
  onSend,
}: {
  events?: readonly MessageStreamEvent[];
  tailIndex?: number;
  onSend?: () => void;
}) => {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
  const pending = [...events];
  const push = (events: readonly MessageStreamEvent[]) => {
    if (controller === undefined) {
      pending.push(...events);
      return;
    }
    for (const event of events) {
      controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
    }
  };
  const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") {
      onSend?.();
      return new Response(
        JSON.stringify({
          sessionId: "session_resumed",
          deliveryId: "delivery_1",
        }),
        { status: 202, headers: { "content-type": "application/json" } },
      );
    }
    return new Response(
      new ReadableStream<Uint8Array>({
        start(streamController) {
          controller = streamController;
          push(pending.splice(0));
        },
      }),
      {
        headers: {
          "x-eve-stream-version": "26",
          "x-eve-stream-tail-index": String(tailIndex),
        },
      },
    );
  });
  vi.stubGlobal("fetch", fetch);
  const session = new ClientSession(
    { host: "http://localhost", resolveHeaders: async () => new Headers() },
    { sessionId: "session_resumed", streamIndex: 0 },
  );
  return { fetch, push, session };
};

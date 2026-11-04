import { Client, type SessionEvent, type SessionStreamEvent } from "eve/client";
import type { Delivery } from "eve/sessions";
import { vi } from "vitest";

export const createEveDelivery = (
  status: "completed" | "failed" = "completed",
): Delivery => ({
  sessionId: "session_resumed",
  deliveryId: "delivery_1",
  async *stream() {},
  async result() {
    const result = {
      sessionId: "session_resumed",
      deliveryId: "delivery_1",
      outcome: status === "failed" ? "failed" : "handled",
      sessionEnded: false,
      reply: undefined,
      data: undefined,
      interactions: [],
    } as const;
    return status === "failed"
      ? { ...result, status, error: { code: "internal", message: "boom" } }
      : { ...result, status };
  },
});

const isDelivery = (value: unknown): value is Delivery =>
  typeof value === "object" &&
  value !== null &&
  "result" in value &&
  typeof value.result === "function";

export const createEveDeliveryAfter = (pending: Promise<unknown>): Delivery => {
  const receipt = createEveDelivery();
  return {
    ...receipt,
    async result(options) {
      const signal = options?.signal;
      const value = await new Promise<unknown>((resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException("The operation was aborted.", "AbortError"));
          return;
        }
        const onAbort = () => {
          signal?.removeEventListener("abort", onAbort);
          reject(new DOMException("The operation was aborted.", "AbortError"));
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        pending.then(
          (result) => {
            signal?.removeEventListener("abort", onAbort);
            resolve(result);
          },
          (error) => {
            signal?.removeEventListener("abort", onAbort);
            reject(error);
          },
        );
      });
      return isDelivery(value)
        ? value.result(options)
        : receipt.result(options);
    },
  };
};

export const createEveEvents = (
  entries: readonly { at: string; event: SessionEvent }[],
  startLine = 0,
): readonly SessionStreamEvent[] =>
  entries.map(({ at, event }, index) => ({
    ...event,
    meta: { at, position: { line: startLine + index, index: 0 } },
  }));

export const createCompletedTurnEvents = ({
  turnId,
  text,
  reply,
  deliveryId = `delivery_${turnId}`,
  startLine = 0,
  follows = null,
  userAt = "2026-01-02T10:00:01.000Z",
  assistantAt = "2026-01-02T10:00:03.000Z",
}: {
  turnId: string;
  text: string;
  reply: string;
  deliveryId?: string;
  startLine?: number;
  follows?: string | null;
  userAt?: string;
  assistantAt?: string;
}): readonly SessionStreamEvent[] => {
  const runId = `run_${turnId}`;
  const partId = `part_${turnId}`;
  return createEveEvents(
    [
      ...(startLine === 0
        ? [
            {
              at: userAt,
              event: { type: "session.started" as const, data: {} },
            },
          ]
        : []),
      {
        at: userAt,
        event: { type: "delivery.admitted", data: { deliveryId } },
      },
      {
        at: userAt,
        event: {
          type: "turn.started",
          data: { turnId, cause: { deliveryId }, follows },
        },
      },
      {
        at: userAt,
        event: {
          type: "delivery.consumed",
          data: { deliveryId, turnId, parts: [{ kind: "text", text }] },
        },
      },
      {
        at: assistantAt,
        event: {
          type: "model.requested",
          data: { runId, owner: { turnId } },
          scope: { turnId },
        },
      },
      {
        at: assistantAt,
        event: {
          type: "model.started",
          data: { runId, modelId: "test-model", attempt: 0 },
          scope: { turnId, runId },
        },
      },
      {
        at: assistantAt,
        event: {
          type: "content.completed",
          data: { partId, runId, kind: "text", value: reply, phase: "reply" },
          scope: { turnId, runId },
        },
      },
      {
        at: assistantAt,
        event: {
          type: "model.settled",
          data: { runId, outcome: "completed", finishReason: "stop" },
          scope: { turnId, runId },
        },
      },
      {
        at: assistantAt,
        event: {
          type: "turn.settled",
          data: { turnId, outcome: "completed", reply: [partId] },
          scope: { turnId },
        },
      },
      {
        at: assistantAt,
        event: {
          type: "delivery.settled",
          data: { deliveryId, outcome: "handled", turnId },
        },
      },
    ] satisfies readonly { at: string; event: SessionEvent }[],
    startLine,
  );
};

export const createEveSessionFixture = ({
  events = [],
  tailIndex = events.length - 1,
  onSend,
}: {
  events?: readonly SessionStreamEvent[];
  tailIndex?: number;
  onSend?: () => void;
}) => {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
  const pending = [...events];
  const encode = (event: SessionStreamEvent) => {
    const { meta, ...fact } = event;
    return `${JSON.stringify(
      event.type.endsWith(".delta") || event.type.endsWith(".progress")
        ? { progress: fact }
        : { at: meta.at, facts: [fact] },
    )}\n`;
  };
  const push = (events: readonly SessionStreamEvent[]) => {
    if (controller === undefined) {
      pending.push(...events);
      return;
    }
    for (const event of events) {
      controller.enqueue(encoder.encode(encode(event)));
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
          "x-eve-stream-version": "27",
          "x-eve-stream-tail-index": String(tailIndex),
        },
      },
    );
  });
  vi.stubGlobal("fetch", fetch);
  const session = new Client({ baseUrl: "http://localhost" }).sessions.attach(
    "session_resumed",
    { streamIndex: 0 },
  );
  return { fetch, push, session };
};

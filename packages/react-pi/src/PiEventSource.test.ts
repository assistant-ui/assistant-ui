import { describe, expect, it, vi } from "vitest";
import { createSseDecoder, openPiEventStream } from "./PiEventSource";
import type { PiAnyClientEvent } from "./piTypes";

describe("createSseDecoder", () => {
  it("decodes a single data frame", () => {
    const decoder = createSseDecoder();
    expect(decoder.push("data: hello\n\n")).toEqual([{ data: "hello" }]);
  });

  it("buffers a frame split across chunks", () => {
    const decoder = createSseDecoder();
    expect(decoder.push("data: hel")).toEqual([]);
    expect(decoder.push("lo\n")).toEqual([]);
    expect(decoder.push("\n")).toEqual([{ data: "hello" }]);
  });

  it("joins multiple data lines with a newline", () => {
    const decoder = createSseDecoder();
    expect(decoder.push("data: a\ndata: b\n\n")).toEqual([{ data: "a\nb" }]);
  });

  it("carries event and id fields and tracks lastEventId", () => {
    const decoder = createSseDecoder();
    expect(decoder.push("event: ping\nid: 7\ndata: x\n\n")).toEqual([
      { event: "ping", id: "7", data: "x" },
    ]);
    expect(decoder.lastEventId).toBe("7");
  });

  it("ignores comment heartbeats and empty frames", () => {
    const decoder = createSseDecoder();
    expect(decoder.push(": keep-alive\n\n")).toEqual([]);
  });

  it("handles CRLF line endings", () => {
    const decoder = createSseDecoder();
    expect(decoder.push("data: a\r\ndata: b\r\n\r\n")).toEqual([
      { data: "a\nb" },
    ]);
  });

  it("emits several frames from one chunk", () => {
    const decoder = createSseDecoder();
    expect(decoder.push("data: 1\n\ndata: 2\n\n")).toEqual([
      { data: "1" },
      { data: "2" },
    ]);
  });

  it("treats a value with no leading space verbatim", () => {
    const decoder = createSseDecoder();
    expect(decoder.push("data:tight\n\n")).toEqual([{ data: "tight" }]);
  });
});

const encoder = new TextEncoder();

/** A fresh SSE `Response` whose body streams `chunks` then closes. */
const sseResponse = (chunks: string[]): Response =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    { status: 200, headers: { "content-type": "text/event-stream" } },
  );

const sseFrame = (event: PiAnyClientEvent): string =>
  `data: ${JSON.stringify(event)}\n\n`;

describe("openPiEventStream", () => {
  it("delivers parsed events from the stream", async () => {
    const events: PiAnyClientEvent[] = [];
    const fetchImpl = (async () =>
      sseResponse([
        sseFrame({ type: "agent_start", threadId: "t1", seq: 1 }),
        sseFrame({ type: "agent_end", threadId: "t1", seq: 2 }),
      ])) as unknown as typeof fetch;

    await new Promise<void>((resolve) => {
      const close = openPiEventStream({
        url: "/events",
        fetchImpl,
        reconnectDelay: () => Promise.resolve(),
        onEvent: (event) => {
          events.push(event);
          if (events.length === 2) {
            close();
            resolve();
          }
        },
      });
    });

    expect(events.map((e) => e.type)).toEqual(["agent_start", "agent_end"]);
    expect(events[0]).toMatchObject({ threadId: "t1", seq: 1 });
  });

  it("uses the controlled fetch stream even when native EventSource exists", async () => {
    const EventSource = vi.fn();
    const fetchImpl = vi.fn(async () =>
      sseResponse([sseFrame({ type: "agent_start", threadId: "t1", seq: 1 })]),
    ) as unknown as typeof fetch;
    vi.stubGlobal("EventSource", EventSource);
    vi.stubGlobal("fetch", fetchImpl);
    try {
      const events: PiAnyClientEvent[] = [];

      await new Promise<void>((resolve) => {
        const close = openPiEventStream({
          url: "/events",
          reconnectDelay: () => Promise.resolve(),
          onEvent: (event) => {
            events.push(event);
            close();
            resolve();
          },
        });
      });

      expect(events).toEqual([{ type: "agent_start", threadId: "t1", seq: 1 }]);
      expect(fetchImpl).toHaveBeenCalledWith("/events", {
        method: "GET",
        signal: expect.any(AbortSignal),
        headers: { Accept: "text/event-stream" },
      });
      expect(EventSource).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("uses the controlled fetch stream when headers are supplied", async () => {
    const EventSource = vi.fn();
    vi.stubGlobal("EventSource", EventSource);
    try {
      let calls = 0;
      const fetchImpl = (async () => {
        calls += 1;
        return sseResponse([
          sseFrame({ type: "agent_start", threadId: "t1", seq: 1 }),
        ]);
      }) as unknown as typeof fetch;

      await new Promise<void>((resolve) => {
        const close = openPiEventStream({
          url: "/events",
          fetchImpl,
          headers: { Authorization: "Bearer token" },
          reconnectDelay: () => Promise.resolve(),
          onEvent: () => {
            close();
            resolve();
          },
        });
      });

      expect(calls).toBe(1);
      expect(EventSource).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("reconnects after a dropped stream", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      if (calls === 1) throw new Error("network drop");
      return sseResponse([
        sseFrame({ type: "agent_start", threadId: "t1", seq: 1 }),
      ]);
    }) as unknown as typeof fetch;

    const errors: unknown[] = [];
    await new Promise<void>((resolve) => {
      const close = openPiEventStream({
        url: "/events",
        fetchImpl,
        reconnectDelay: () => Promise.resolve(),
        onError: (error) => errors.push(error),
        onEvent: () => {
          close();
          resolve();
        },
      });
    });

    expect(calls).toBeGreaterThanOrEqual(2);
    expect(errors).toHaveLength(1);
  });

  it("reports a bad-JSON frame via onError without crashing the stream", async () => {
    const events: PiAnyClientEvent[] = [];
    const errors: unknown[] = [];
    const fetchImpl = (async () =>
      sseResponse([
        "data: not-json\n\n",
        sseFrame({ type: "agent_end", threadId: "t1", seq: 5 }),
      ])) as unknown as typeof fetch;

    await new Promise<void>((resolve) => {
      const close = openPiEventStream({
        url: "/events",
        fetchImpl,
        reconnectDelay: () => Promise.resolve(),
        onError: (error) => errors.push(error),
        onEvent: (event) => {
          events.push(event);
          close();
          resolve();
        },
      });
    });

    expect(errors).toHaveLength(1);
    expect(events.map((e) => e.type)).toEqual(["agent_end"]);
  });

  it("stops and does not surface abort as an error after close()", async () => {
    const onError = vi.fn();
    const onEvent = vi.fn();
    const fetchImpl = (async () =>
      new Response(
        // A body that never enqueues — only an abort can end the read.
        new ReadableStream<Uint8Array>({ start() {} }),
        { status: 200 },
      )) as unknown as typeof fetch;

    const close = openPiEventStream({
      url: "/events",
      fetchImpl,
      reconnectDelay: () => Promise.resolve(),
      onError,
      onEvent,
    });

    // Let the fetch resolve and the reader park on read(), then close.
    await Promise.resolve();
    await Promise.resolve();
    close();
    await Promise.resolve();

    expect(onEvent).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});

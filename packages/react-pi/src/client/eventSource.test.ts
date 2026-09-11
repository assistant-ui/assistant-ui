import { describe, expect, it, vi } from "vitest";
import { createSseDecoder, openPiEventStream } from "./eventSource";
import type {
  PiAnyClientEvent,
  PiAssistantMessage,
  PiClientEventBody,
} from "../types";

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

  it("carries event and id fields", () => {
    const decoder = createSseDecoder();
    expect(decoder.push("event: ping\nid: 7\ndata: x\n\n")).toEqual([
      { event: "ping", id: "7", data: "x" },
    ]);
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

  it("handles CRLF line endings split across chunks", () => {
    const decoder = createSseDecoder();
    const frames = [
      ...decoder.push("data: hello\r"),
      ...decoder.push("\n\r"),
      ...decoder.push("\n"),
    ];

    expect(frames).toEqual([{ data: "hello" }]);
  });

  it("handles CR-only line endings across chunks", () => {
    const decoder = createSseDecoder();
    expect(decoder.push("data: a\r")).toEqual([]);
    expect(decoder.push("data: b\r")).toEqual([]);
    expect(decoder.push("\r")).toEqual([{ data: "a\nb" }]);
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

const streamResponse = (chunks: string[], contentType?: string): Response => {
  const init: ResponseInit = { status: 200 };
  if (contentType !== undefined) {
    init.headers = { "content-type": contentType };
  }

  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    init,
  );
};

/** A fresh SSE `Response` whose body streams `chunks` then closes. */
const sseResponse = (
  chunks: string[],
  contentType = "text/event-stream",
): Response => streamResponse(chunks, contentType);

const sseFrame = (event: PiAnyClientEvent): string =>
  `data: ${JSON.stringify(event)}\n\n`;

const rawSseFrame = (event: unknown): string =>
  `data: ${JSON.stringify(event)}\n\n`;

const assistantMessage: PiAssistantMessage = {
  role: "assistant",
  content: [{ type: "text", text: "Hello" }],
  api: "anthropic-messages",
  provider: "anthropic",
  model: "claude",
  usage: {
    input: 1,
    output: 1,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 2,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  },
  stopReason: "stop",
  timestamp: 1,
};

const knownEventBodies = {
  snapshot: {
    type: "snapshot",
    snapshot: {
      metadata: { id: "t1", title: "Thread", status: "idle" },
      messages: [],
    },
  },
  agent_start: { type: "agent_start" },
  agent_end: { type: "agent_end", willRetry: false },
  agent_settled: { type: "agent_settled" },
  turn_start: { type: "turn_start", turnIndex: 1 },
  turn_end: { type: "turn_end", turnIndex: 1 },
  message_start: { type: "message_start", message: assistantMessage },
  message_update: {
    type: "message_update",
    message: assistantMessage,
    assistantMessageEvent: { type: "start", partial: assistantMessage },
  },
  message_end: { type: "message_end", message: assistantMessage },
  tool_execution_start: {
    type: "tool_execution_start",
    toolCallId: "tool-1",
    toolName: "search",
    args: { query: "assistant-ui" },
  },
  tool_execution_update: {
    type: "tool_execution_update",
    toolCallId: "tool-1",
    toolName: "search",
    partialResult: { content: [] },
  },
  tool_execution_end: {
    type: "tool_execution_end",
    toolCallId: "tool-1",
    result: { content: [] },
    isError: false,
  },
  queue_update: {
    type: "queue_update",
    steering: ["steer"],
    followUp: ["follow up"],
  },
  compaction_start: { type: "compaction_start", reason: "threshold" },
  compaction_end: {
    type: "compaction_end",
    aborted: false,
    willRetry: false,
  },
  entry_appended: {
    type: "entry_appended",
    entry: {
      id: "entry-1",
      parentId: null,
      timestamp: "2026-08-18T00:00:00.000Z",
      type: "custom",
      customType: "test",
    },
  },
  auto_retry_start: { type: "auto_retry_start", attempt: 1, delayMs: 100 },
  auto_retry_end: { type: "auto_retry_end", success: true },
  session_info_changed: { type: "session_info_changed", name: "Thread" },
  thinking_level_changed: { type: "thinking_level_changed", level: "high" },
  context_usage: {
    type: "context_usage",
    contextUsage: { tokens: 10, contextWindow: 100, percent: 10 },
  },
  extension_ui_request: {
    type: "extension_ui_request",
    request: {
      id: "request-1",
      kind: "confirm",
      title: "Continue?",
      message: "Allow the tool to continue?",
    },
  },
  extension_ui_resolved: {
    type: "extension_ui_resolved",
    requestId: "request-1",
  },
  error: { type: "error", error: "model unavailable" },
} satisfies {
  [Type in PiClientEventBody["type"]]: Extract<
    PiClientEventBody,
    { type: Type }
  >;
};

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

  it("delivers every known event type", async () => {
    const bodies = Object.values(knownEventBodies);
    const events: PiAnyClientEvent[] = [];
    const fetchImpl = (async () =>
      sseResponse(
        bodies.map((body, index) =>
          rawSseFrame({ ...body, threadId: "t1", seq: index + 1 }),
        ),
      )) as unknown as typeof fetch;

    await new Promise<void>((resolve, reject) => {
      let close!: () => void;
      close = openPiEventStream({
        url: "/events",
        fetchImpl,
        reconnectDelay: () => Promise.resolve(),
        onError: (error) => {
          close();
          reject(error);
        },
        onEvent: (event) => {
          events.push(event);
          if (events.length === bodies.length) {
            close();
            resolve();
          }
        },
      });
    });

    expect(events.map((event) => event.type)).toEqual(
      bodies.map((body) => body.type),
    );
  });

  it("accepts parameterized event stream content types", async () => {
    const fetchImpl = (async () =>
      sseResponse(
        [sseFrame({ type: "agent_start", threadId: "t1", seq: 1 })],
        "Text/Event-Stream; charset=utf-8",
      )) as unknown as typeof fetch;

    const event = await new Promise<PiAnyClientEvent>((resolve) => {
      const close = openPiEventStream({
        url: "/events",
        fetchImpl,
        reconnectDelay: () => Promise.resolve(),
        onEvent: (value) => {
          close();
          resolve(value);
        },
      });
    });

    expect(event).toMatchObject({ type: "agent_start", threadId: "t1" });
  });

  it.each([
    ["HTML", "text/html; charset=utf-8", '"text/html; charset=utf-8"'],
    ["JSON", "application/json", '"application/json"'],
    ["a missing content type", undefined, "no Content-Type header"],
  ])(
    "reports %s responses through onError",
    async (_label, contentType, received) => {
      const fetchImpl = vi.fn(async () =>
        streamResponse(["not an event stream"], contentType),
      ) as unknown as typeof fetch;

      const error = await new Promise<unknown>((resolve) => {
        let close!: () => void;
        close = openPiEventStream({
          url: "/events",
          fetchImpl,
          reconnectDelay: () => Promise.resolve(),
          onEvent: vi.fn(),
          onError: (value) => {
            close();
            resolve(value);
          },
        });
      });

      expect(error).toEqual(
        new Error(
          `Expected Pi event stream Content-Type "text/event-stream", received ${received}`,
        ),
      );
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    },
  );

  it("reconnects after an invalid response content type", async () => {
    let calls = 0;
    const cancelBody = vi.fn();
    const fetchImpl = (async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(encoder.encode("<html>Please sign in</html>"));
            },
            cancel: cancelBody,
          }),
          { status: 200, headers: { "content-type": "text/html" } },
        );
      }
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

    expect(calls).toBe(2);
    expect(cancelBody).toHaveBeenCalledOnce();
    expect(errors).toEqual([
      new Error(
        'Expected Pi event stream Content-Type "text/event-stream", received "text/html"',
      ),
    ]);
  });

  it("cancels a failed response body before reconnecting", async () => {
    let calls = 0;
    const cancelBody = vi.fn();
    const fetchImpl = (async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(
          new ReadableStream<Uint8Array>({ start() {}, cancel: cancelBody }),
          { status: 503 },
        );
      }
      expect(cancelBody).toHaveBeenCalledOnce();
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

    expect(calls).toBe(2);
    expect(cancelBody).toHaveBeenCalledOnce();
    expect(errors).toEqual([new Error("Pi event stream failed: HTTP 503")]);
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

  it("notifies each successful connection before its events", async () => {
    let calls = 0;
    const onConnect = vi.fn();
    const fetchImpl = (async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.close();
            },
          }),
          {
            status: 200,
            headers: { "content-type": "text/event-stream" },
          },
        );
      }
      return sseResponse([
        sseFrame({ type: "agent_start", threadId: "t1", seq: 1 }),
      ]);
    }) as unknown as typeof fetch;

    await new Promise<void>((resolve) => {
      const close = openPiEventStream({
        url: "/events",
        fetchImpl,
        reconnectDelay: () => Promise.resolve(),
        onConnect,
        onEvent: () => {
          close();
          resolve();
        },
      });
    });

    expect(onConnect).toHaveBeenCalledTimes(2);
  });

  it("releases a completed response body before reconnecting", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.close();
      },
    });
    const fetchImpl = vi.fn(
      async () =>
        new Response(body, {
          headers: { "content-type": "text/event-stream" },
        }),
    ) as unknown as typeof fetch;

    await new Promise<void>((resolve) => {
      let close!: () => void;
      close = openPiEventStream({
        url: "/events",
        fetchImpl,
        onEvent: vi.fn(),
        reconnectDelay: () => {
          expect(body.locked).toBe(false);
          close();
          resolve();
          return Promise.resolve();
        },
      });
    });

    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it.each(["throws", "rejects"] as const)(
    "reconnects when the error callback %s",
    async (failureMode) => {
      let calls = 0;
      const networkError = new Error("network drop");
      const callbackError = new Error("telemetry failed");
      const fetchImpl = (async () => {
        calls += 1;
        if (calls === 1) throw networkError;
        return sseResponse([
          sseFrame({ type: "agent_start", threadId: "t1", seq: 1 }),
        ]);
      }) as unknown as typeof fetch;
      const onError = vi.fn(() => {
        if (failureMode === "throws") throw callbackError;
        return Promise.reject(callbackError);
      });
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);

      try {
        await new Promise<void>((resolve) => {
          const close = openPiEventStream({
            url: "/events",
            fetchImpl,
            reconnectDelay: () => Promise.resolve(),
            onError,
            onEvent: () => {
              close();
              resolve();
            },
          });
        });

        expect(calls).toBe(2);
        expect(onError).toHaveBeenCalledWith(networkError);
        expect(consoleError).toHaveBeenCalledWith(
          "[react-pi] onError callback threw an error",
          callbackError,
        );
      } finally {
        consoleError.mockRestore();
      }
    },
  );

  it.each(["throws", "rejects"] as const)(
    "continues without reconnecting when the event callback %s",
    async (failureMode) => {
      const callbackError = new Error("consumer failed");
      const fetchImpl = vi.fn(async () =>
        sseResponse([
          sseFrame({ type: "agent_start", threadId: "t1", seq: 1 }),
          sseFrame({ type: "agent_end", threadId: "t1", seq: 2 }),
        ]),
      ) as unknown as typeof fetch;
      const onError = vi.fn();
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      let events = 0;

      try {
        await new Promise<void>((resolve) => {
          const close = openPiEventStream({
            url: "/events",
            fetchImpl,
            reconnectDelay: () => Promise.resolve(),
            onError,
            onEvent: () => {
              events += 1;
              if (events === 1) {
                if (failureMode === "throws") throw callbackError;
                return Promise.reject(callbackError);
              }
              close();
              resolve();
            },
          });
        });
        await Promise.resolve();

        expect(events).toBe(2);
        expect(fetchImpl).toHaveBeenCalledOnce();
        expect(onError).not.toHaveBeenCalled();
        expect(consoleError).toHaveBeenCalledWith(
          "[react-pi] onEvent callback threw an error",
          callbackError,
        );
      } finally {
        consoleError.mockRestore();
      }
    },
  );

  it("reconnects when the reconnect delay rejects", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const networkError = new Error("network drop");
    const delayError = new Error("delay failed");
    const fetchImpl = (async () => {
      calls += 1;
      if (calls === 1) throw networkError;
      return sseResponse([
        sseFrame({ type: "agent_start", threadId: "t1", seq: 1 }),
      ]);
    }) as unknown as typeof fetch;
    const onError = vi.fn();

    try {
      const event = new Promise<void>((resolve) => {
        const close = openPiEventStream({
          url: "/events",
          fetchImpl,
          reconnectDelay: () => Promise.reject(delayError),
          onError,
          onEvent: () => {
            close();
            resolve();
          },
        });
      });

      await Promise.resolve();
      await Promise.resolve();
      expect(calls).toBe(1);
      await vi.advanceTimersByTimeAsync(1000);
      await event;
    } finally {
      vi.useRealTimers();
    }

    expect(calls).toBe(2);
    expect(onError).toHaveBeenNthCalledWith(1, networkError);
    expect(onError).toHaveBeenNthCalledWith(2, delayError);
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

  it.each([
    [
      { type: "agent_start", threadId: 42, seq: 1 },
      'expected a non-empty string "threadId"',
    ],
    [
      { type: "message_start", threadId: "t1", seq: 1 },
      'event "message_start" has an invalid payload',
    ],
    [
      {
        type: "message_start",
        threadId: "t1",
        seq: 1,
        message: { role: "assistant", content: [] },
      },
      'event "message_start" has an invalid payload',
    ],
    [
      {
        type: "message_update",
        threadId: "t1",
        seq: 1,
        message: assistantMessage,
        assistantMessageEvent: { type: "text_delta" },
      },
      'event "message_update" has an invalid payload',
    ],
    [
      {
        type: "tool_execution_start",
        threadId: "t1",
        seq: 1,
        toolCallId: "tool-1",
        toolName: "search",
      },
      'event "tool_execution_start" has an invalid payload',
    ],
    [
      {
        type: "tool_execution_update",
        threadId: "t1",
        seq: 1,
        toolCallId: "tool-1",
      },
      'event "tool_execution_update" has an invalid payload',
    ],
    [
      {
        type: "tool_execution_end",
        threadId: "t1",
        seq: 1,
        toolCallId: "tool-1",
        isError: false,
      },
      'event "tool_execution_end" has an invalid payload',
    ],
    [
      { type: "agent_start", threadId: "t1" },
      'expected a non-negative safe integer "seq"',
    ],
    [
      { type: "agent_start", threadId: "t1", seq: -1 },
      'expected a non-negative safe integer "seq"',
    ],
    [
      { type: "agent_start", threadId: "t1", seq: 1.5 },
      'expected a non-negative safe integer "seq"',
    ],
    [
      {
        type: "snapshot",
        threadId: "t1",
        seq: 1,
        snapshot: {
          metadata: { id: "t1", status: "idle" },
          messages: [{ role: "assistant" }],
        },
      },
      'event "snapshot" has an invalid payload',
    ],
    [
      {
        type: "snapshot",
        threadId: "t1",
        seq: 1,
        snapshot: {
          metadata: { id: "t1", status: "idle" },
          messages: [{ role: "bashExecution" }],
        },
      },
      'event "snapshot" has an invalid payload',
    ],
    [
      {
        type: "snapshot",
        threadId: "t1",
        seq: 1,
        snapshot: {
          metadata: { id: "t1", status: "idle" },
          messages: [{ role: "custom", content: "note" }],
        },
      },
      'event "snapshot" has an invalid payload',
    ],
    [
      {
        type: "queue_update",
        threadId: "t1",
        seq: 1,
        steering: "steer",
        followUp: [],
      },
      'event "queue_update" has an invalid payload',
    ],
    [
      {
        type: "context_usage",
        threadId: "t1",
        seq: 1,
        contextUsage: { tokens: 1, contextWindow: "large", percent: 1 },
      },
      'event "context_usage" has an invalid payload',
    ],
    [
      {
        type: "extension_ui_request",
        threadId: "t1",
        seq: 1,
        request: { id: "request-1", kind: "confirm", title: "Continue?" },
      },
      'event "extension_ui_request" has an invalid payload',
    ],
    [
      {
        type: "compaction_start",
        threadId: "t1",
        seq: 1,
        reason: 1,
      },
      'event "compaction_start" has an invalid payload',
    ],
  ])(
    "reports malformed event payloads without delivering them",
    async (malformedEvent, expectedMessage) => {
      const events: PiAnyClientEvent[] = [];
      const errors: unknown[] = [];
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(
          sseResponse([
            rawSseFrame(malformedEvent),
            sseFrame({ type: "agent_end", threadId: "t1", seq: 99 }),
          ]),
        )
        .mockResolvedValueOnce(
          sseResponse([
            sseFrame({ type: "agent_end", threadId: "t1", seq: 2 }),
          ]),
        ) as unknown as typeof fetch;

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

      expect(errors).toEqual([
        expect.objectContaining({
          message: expect.stringContaining(expectedMessage),
        }),
      ]);
      expect(events.map((event) => event.type)).toEqual(["agent_end"]);
      expect(events[0]?.seq).toBe(2);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    },
  );

  it("reconnects when an event belongs to another thread", async () => {
    const events: PiAnyClientEvent[] = [];
    const errors: unknown[] = [];
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        sseResponse([
          sseFrame({ type: "agent_start", threadId: "t2", seq: 1 }),
        ]),
      )
      .mockResolvedValueOnce(
        sseResponse([
          sseFrame({ type: "agent_start", threadId: "t1", seq: 2 }),
        ]),
      ) as unknown as typeof fetch;

    await new Promise<void>((resolve) => {
      const close = openPiEventStream({
        url: "/events",
        expectedThreadId: "t1",
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

    expect(errors).toEqual([
      expect.objectContaining({
        message: expect.stringContaining('expected thread "t1", received "t2"'),
      }),
    ]);
    expect(events).toEqual([
      expect.objectContaining({ type: "agent_start", threadId: "t1", seq: 2 }),
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("accepts seq 0 and live assistant frames with pending stop reasons", async () => {
    const liveAssistant = { ...assistantMessage, stopReason: "pending" };
    const events: PiAnyClientEvent[] = [];
    const fetchImpl = (async () =>
      sseResponse([
        sseFrame({ type: "agent_start", threadId: "t1", seq: 0 }),
        rawSseFrame({
          type: "message_start",
          threadId: "t1",
          seq: 1,
          message: liveAssistant,
        }),
        rawSseFrame({
          type: "message_update",
          threadId: "t1",
          seq: 2,
          message: liveAssistant,
          assistantMessageEvent: {
            type: "start",
            partial: liveAssistant,
          },
        }),
      ])) as unknown as typeof fetch;

    await new Promise<void>((resolve, reject) => {
      let close!: () => void;
      close = openPiEventStream({
        url: "/events",
        fetchImpl,
        onError: (error) => {
          close();
          reject(error);
        },
        onEvent: (event) => {
          events.push(event);
          if (events.length === 3) {
            close();
            resolve();
          }
        },
      });
    });

    expect(events).toEqual([
      expect.objectContaining({ type: "agent_start", seq: 0 }),
      expect.objectContaining({ type: "message_start", seq: 1 }),
      expect.objectContaining({ type: "message_update", seq: 2 }),
    ]);
  });

  it("accepts live tool calls whose arguments are still null", async () => {
    const liveToolCall = {
      ...assistantMessage,
      stopReason: "pending",
      content: [
        { type: "toolCall", id: "tc1", name: "search", arguments: null },
      ],
    };
    const event = await new Promise<PiAnyClientEvent>((resolve, reject) => {
      let close!: () => void;
      close = openPiEventStream({
        url: "/events",
        fetchImpl: (async () =>
          sseResponse([
            rawSseFrame({
              type: "message_update",
              threadId: "t1",
              seq: 1,
              message: liveToolCall,
              assistantMessageEvent: {
                type: "toolcall_start",
                contentIndex: 0,
                partial: liveToolCall,
              },
            }),
          ])) as unknown as typeof fetch,
        onError: (error) => {
          close();
          reject(error);
        },
        onEvent: (value) => {
          close();
          resolve(value);
        },
      });
    });

    expect(event).toMatchObject({
      type: "message_update",
      seq: 1,
    });
  });

  it("accepts snapshots with renderable incomplete assistants", async () => {
    const event = await new Promise<PiAnyClientEvent>((resolve, reject) => {
      let close!: () => void;
      close = openPiEventStream({
        url: "/events",
        fetchImpl: (async () =>
          sseResponse([
            rawSseFrame({
              type: "snapshot",
              threadId: "t1",
              seq: 1,
              snapshot: {
                metadata: { id: "t1", status: "idle" },
                messages: [
                  {
                    role: "assistant",
                    content: [{ type: "text", text: "Hello" }],
                    responseModel: null,
                    errorMessage: null,
                  },
                  { role: "bashExecution", command: "ls", output: "x" },
                ],
              },
            }),
          ])) as unknown as typeof fetch,
        onError: (error) => {
          close();
          reject(error);
        },
        onEvent: (value) => {
          close();
          resolve(value);
        },
      });
    });

    expect(event.type).toBe("snapshot");
  });

  it.each(["malformed", "closed", "error"])(
    "requests a snapshot after a %s live-only stream",
    async (failure) => {
      const fetchImpl = vi
        .fn()
        .mockImplementationOnce(async () => {
          if (failure === "error") throw new Error("network drop");
          return sseResponse(
            failure === "closed"
              ? []
              : [rawSseFrame({ type: "message_end", threadId: "t1", seq: 1 })],
          );
        })
        .mockResolvedValueOnce(
          sseResponse([
            sseFrame({
              type: "snapshot",
              threadId: "t1",
              seq: 2,
              snapshot: {
                metadata: { id: "t1", status: "idle" },
                messages: [],
              },
            }),
          ]),
        ) as unknown as typeof fetch;

      const event = await new Promise<PiAnyClientEvent>((resolve) => {
        const close = openPiEventStream({
          url: "/events?snapshot=false",
          snapshotRecoveryUrl: "/events",
          expectedThreadId: "t1",
          fetchImpl,
          reconnectDelay: () => Promise.resolve(),
          onEvent: (value) => {
            close();
            resolve(value);
          },
        });
      });

      expect(event.type).toBe("snapshot");
      expect(fetchImpl.mock.calls.map(([requestUrl]) => requestUrl)).toEqual([
        "/events?snapshot=false",
        "/events",
      ]);
    },
  );

  it("preserves forward-compatible values in known event types", async () => {
    const events: PiAnyClientEvent[] = [];
    const fetchImpl = (async () =>
      sseResponse([
        rawSseFrame({
          type: "compaction_start",
          threadId: "t1",
          seq: 1,
          reason: "future_reason",
        }),
        rawSseFrame({
          type: "extension_ui_request",
          threadId: "t1",
          seq: 2,
          request: {
            id: "request-1",
            kind: "future_dialog",
            title: "Future dialog",
          },
        }),
      ])) as unknown as typeof fetch;

    await new Promise<void>((resolve) => {
      const close = openPiEventStream({
        url: "/events",
        fetchImpl,
        onEvent: (event) => {
          events.push(event);
          if (events.length === 2) {
            close();
            resolve();
          }
        },
      });
    });

    expect(events).toEqual([
      expect.objectContaining({ type: "compaction_start" }),
      expect.objectContaining({ type: "extension_ui_request" }),
    ]);
  });

  it("preserves forward-compatible unknown event types", async () => {
    const event = await new Promise<PiAnyClientEvent>((resolve) => {
      const close = openPiEventStream({
        url: "/events",
        fetchImpl: (async () =>
          sseResponse([
            rawSseFrame({
              type: "future_event",
              threadId: "t1",
              seq: 1,
              payload: { value: true },
            }),
          ])) as unknown as typeof fetch,
        onEvent: (value) => {
          close();
          resolve(value);
        },
      });
    });

    expect(event).toEqual({
      type: "future_event",
      threadId: "t1",
      seq: 1,
      payload: { value: true },
    });
  });

  it("stops and does not surface abort as an error after close()", async () => {
    const onError = vi.fn();
    const onEvent = vi.fn();
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({ start() {}, cancel });
    const fetchImpl = (async () =>
      new Response(body, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      })) as unknown as typeof fetch;

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
    expect(body.locked).toBe(true);
    close();
    await vi.waitFor(() => expect(body.locked).toBe(false));

    expect(onEvent).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledOnce();
  });
});

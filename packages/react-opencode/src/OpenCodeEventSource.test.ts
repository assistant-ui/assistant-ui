import { describe, it, expect, vi } from "vitest";
import {
  createOpencodeClient,
  type EventSessionStatus,
} from "@opencode-ai/sdk/v2/client";
import {
  OpenCodeEventSource,
  STREAM_RECONNECTED_EVENT_TYPE,
} from "./OpenCodeEventSource";

const waitFor = async (assertion: () => void) => {
  let lastError: unknown;

  for (let i = 0; i < 20; i++) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  throw lastError;
};

const createAbortableStream = (signal: AbortSignal) =>
  (async function* () {
    yield { type: "server.connected", properties: {} };
    await new Promise<void>((resolve) => {
      if (signal.aborted) {
        resolve();
        return;
      }

      signal.addEventListener("abort", () => resolve(), { once: true });
    });
  })();

describe("OpenCodeEventSource", () => {
  it.each(["http", "network"] as const)(
    "backs off repeated %s connection failures up to thirty seconds",
    async (failure) => {
      vi.useFakeTimers();
      const fetchImpl = vi.fn(async () => {
        if (failure === "network") throw new Error("offline");
        return new Response(null, { status: 503 });
      });
      const source = new OpenCodeEventSource(
        createOpencodeClient({
          baseUrl: "https://opencode.test",
          fetch: fetchImpl,
        }),
      );
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      try {
        source.subscribe(vi.fn());
        await vi.advanceTimersByTimeAsync(0);
        expect(fetchImpl).toHaveBeenCalledOnce();

        const delays = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000];
        for (const [index, delay] of delays.entries()) {
          await vi.advanceTimersByTimeAsync(delay - 1);
          expect(fetchImpl).toHaveBeenCalledTimes(index + 1);
          await vi.advanceTimersByTimeAsync(1);
          expect(fetchImpl).toHaveBeenCalledTimes(index + 2);
        }
      } finally {
        source.dispose();
        await vi.advanceTimersByTimeAsync(0);
        warnSpy.mockRestore();
        vi.useRealTimers();
      }
    },
  );

  it("only announces successful reconnects and resets backoff after receiving events", async () => {
    vi.useFakeTimers();
    let activeStream!: ReadableStreamDefaultController<Uint8Array>;
    const connect = async () =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            activeStream = controller;
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"type":"server.connected","properties":{}}\n\n',
              ),
            );
          },
        }),
        { headers: { "Content-Type": "text/event-stream" } },
      );
    const fetchImpl = vi
      .fn(connect)
      .mockImplementationOnce(async () => new Response(null, { status: 503 }))
      .mockImplementationOnce(async () => new Response(null, { status: 503 }))
      .mockImplementationOnce(connect)
      .mockImplementationOnce(async () => new Response(null, { status: 503 }));
    const source = new OpenCodeEventSource(
      createOpencodeClient({
        baseUrl: "https://opencode.test",
        fetch: fetchImpl,
      }),
    );
    const listener = vi.fn();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      source.subscribe(listener);
      await vi.advanceTimersByTimeAsync(2999);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
      expect(listener).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(fetchImpl).toHaveBeenCalledTimes(3);
      expect(listener.mock.calls.map(([event]) => event.type)).toEqual([
        STREAM_RECONNECTED_EVENT_TYPE,
        "server.connected",
      ]);

      activeStream.error(new Error("connection dropped"));
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(999);
      expect(fetchImpl).toHaveBeenCalledTimes(3);
      await vi.advanceTimersByTimeAsync(1);
      expect(fetchImpl).toHaveBeenCalledTimes(4);
      expect(listener).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(999);
      expect(fetchImpl).toHaveBeenCalledTimes(4);
      await vi.advanceTimersByTimeAsync(1);
      expect(fetchImpl).toHaveBeenCalledTimes(5);
      expect(listener.mock.calls.map(([event]) => event.type)).toEqual([
        STREAM_RECONNECTED_EVENT_TYPE,
        "server.connected",
        STREAM_RECONNECTED_EVENT_TYPE,
        "server.connected",
      ]);
    } finally {
      source.dispose();
      await vi.advanceTimersByTimeAsync(0);
      warn.mockRestore();
      vi.useRealTimers();
    }
  });

  it("reconnects immediately when a listener returns during backoff", async () => {
    const client = {
      event: {
        subscribe: vi
          .fn()
          .mockRejectedValueOnce(new Error("offline"))
          .mockImplementation((_: unknown, options: { signal: AbortSignal }) =>
            Promise.resolve({
              stream: createAbortableStream(options.signal),
            }),
          ),
      },
    };
    const source = new OpenCodeEventSource(client as never);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const unsubscribe = source.subscribe(vi.fn());

      await waitFor(() => {
        expect(warnSpy).toHaveBeenCalledTimes(1);
      });

      unsubscribe();
      source.subscribe(vi.fn());

      await waitFor(() => {
        expect(client.event.subscribe).toHaveBeenCalledTimes(2);
      });
    } finally {
      source.dispose();
      warnSpy.mockRestore();
    }
  });

  it("reconnects immediately when a listener returns after disconnect", async () => {
    const client = {
      event: {
        subscribe: vi.fn((_: unknown, options: { signal: AbortSignal }) =>
          Promise.resolve({
            stream: createAbortableStream(options.signal),
          }),
        ),
      },
    };
    const source = new OpenCodeEventSource(client as never);

    const unsubscribe = source.subscribe(vi.fn());

    await waitFor(() => {
      expect(client.event.subscribe).toHaveBeenCalledTimes(1);
    });
    expect(client.event.subscribe).toHaveBeenLastCalledWith(undefined, {
      signal: expect.any(AbortSignal),
      sseMaxRetryAttempts: 1,
      onSseError: expect.any(Function),
    });

    unsubscribe();
    await Promise.resolve();
    source.subscribe(vi.fn());

    await waitFor(() => {
      expect(client.event.subscribe).toHaveBeenCalledTimes(2);
    });
  });

  it("notifies listeners on reconnect but not on the first connection", async () => {
    const client = {
      event: {
        subscribe: vi.fn((_: unknown, options: { signal: AbortSignal }) =>
          Promise.resolve({
            stream: createAbortableStream(options.signal),
          }),
        ),
      },
    };
    const source = new OpenCodeEventSource(client as never);

    const firstListener = vi.fn();
    const unsubscribe = source.subscribe(firstListener);

    await waitFor(() => {
      expect(firstListener).toHaveBeenCalledWith(
        expect.objectContaining({ type: "server.connected" }),
      );
    });
    expect(firstListener).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: STREAM_RECONNECTED_EVENT_TYPE }),
    );

    unsubscribe();
    await Promise.resolve();
    const secondListener = vi.fn();
    source.subscribe(secondListener);

    await waitFor(() => {
      expect(secondListener).toHaveBeenCalledWith(
        expect.objectContaining({ type: STREAM_RECONNECTED_EVENT_TYPE }),
      );
    });
    expect(secondListener.mock.calls.map(([event]) => event.type)).toEqual([
      STREAM_RECONNECTED_EVENT_TYPE,
      "server.connected",
    ]);
  });

  it("continues notifying listeners when one throws", () => {
    const source = new OpenCodeEventSource({} as never) as any;
    const listener = vi.fn();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    source.listeners.add(() => {
      throw new Error("boom");
    });
    source.listeners.add(listener);

    source.emit({
      type: "session.updated",
      sessionId: "ses_1",
      properties: {},
      raw: {},
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });

  it("delivers provider events with their session and properties", async () => {
    const event = {
      id: "evt_1",
      type: "session.status",
      properties: { sessionID: "ses_1", status: { type: "idle" } },
    } satisfies EventSessionStatus;
    let consumed!: () => void;
    const streamConsumed = new Promise<void>((resolve) => {
      consumed = resolve;
    });
    const subscribe = vi.fn().mockResolvedValue({
      stream: (async function* () {
        yield event;
        consumed();
      })(),
    });
    const source = new OpenCodeEventSource({ event: { subscribe } } as never);
    const listener = vi.fn();

    try {
      source.subscribe(listener);
      await streamConsumed;

      expect(listener).toHaveBeenCalledExactlyOnceWith({
        type: "session.status",
        sessionId: "ses_1",
        properties: { sessionID: "ses_1", status: { type: "idle" } },
        raw: event,
      });
    } finally {
      source.dispose();
    }
  });
});

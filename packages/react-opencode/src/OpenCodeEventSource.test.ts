import { describe, it, expect, vi } from "vitest";
import type { EventSessionStatus } from "@opencode-ai/sdk/v2/client";
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
    await new Promise<void>((resolve) => {
      if (signal.aborted) {
        resolve();
        return;
      }

      signal.addEventListener("abort", () => resolve(), { once: true });
    });
  })();

describe("OpenCodeEventSource", () => {
  it("backs off repeated connection failures up to thirty seconds", async () => {
    vi.useFakeTimers();
    const subscribe = vi.fn().mockRejectedValue(new Error("offline"));
    const source = new OpenCodeEventSource({ event: { subscribe } } as never);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      source.subscribe(vi.fn());
      await vi.advanceTimersByTimeAsync(0);
      expect(subscribe).toHaveBeenCalledOnce();

      const delays = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000];
      for (const [index, delay] of delays.entries()) {
        await vi.advanceTimersByTimeAsync(delay - 1);
        expect(subscribe).toHaveBeenCalledTimes(index + 1);
        await vi.advanceTimersByTimeAsync(1);
        expect(subscribe).toHaveBeenCalledTimes(index + 2);
      }
    } finally {
      source.dispose();
      await vi.advanceTimersByTimeAsync(0);
      warnSpy.mockRestore();
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
      expect(client.event.subscribe).toHaveBeenCalledTimes(1);
    });
    expect(firstListener).not.toHaveBeenCalled();

    unsubscribe();
    await Promise.resolve();
    const secondListener = vi.fn();
    source.subscribe(secondListener);

    await waitFor(() => {
      expect(secondListener).toHaveBeenCalledWith(
        expect.objectContaining({ type: STREAM_RECONNECTED_EVENT_TYPE }),
      );
    });
    expect(secondListener).toHaveBeenCalledTimes(1);
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

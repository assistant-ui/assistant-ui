import { describe, it, expect, vi } from "vitest";
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

const createEventStream = (signal: AbortSignal, events: readonly unknown[]) =>
  (async function* () {
    yield* events;
    yield* createAbortableStream(signal);
  })();

describe("OpenCodeEventSource", () => {
  it("rejects unroutable message updates without dropping compatible events", async () => {
    const client = {
      event: {
        subscribe: vi.fn((_: unknown, options: { signal: AbortSignal }) =>
          Promise.resolve({
            stream: createEventStream(options.signal, [
              {
                type: "message.updated",
                properties: {
                  sessionID: "ses_1",
                  info: { sessionID: "ses_1", role: "assistant" },
                },
              },
              {
                type: "message.updated",
                properties: {
                  sessionID: "ses_1",
                  info: {
                    id: "wrong-session",
                    sessionID: "ses_2",
                    role: "assistant",
                  },
                },
              },
              {
                type: "message.updated",
                properties: {
                  sessionID: "ses_1",
                  info: {
                    id: "future-role",
                    sessionID: "ses_1",
                    role: "system",
                  },
                },
              },
              {
                type: "future.event",
                properties: { sessionID: "ses_1", value: 42 },
              },
            ]),
          }),
        ),
      },
    };
    const source = new OpenCodeEventSource(client as never);
    const listener = vi.fn();

    try {
      source.subscribe(listener);

      await waitFor(() => {
        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({ type: "future.event" }),
        );
      });
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "message.updated",
          properties: expect.objectContaining({
            info: expect.objectContaining({ role: "system" }),
          }),
        }),
      );
    } finally {
      source.dispose();
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
});

import { OpenCodeEventSource } from "./OpenCodeEventSource";

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

import { describe, it, expect, vi } from "vitest";
import { adkEventStream } from "./adkEventStream";

async function* yieldEvents(events: unknown[]) {
  for (const event of events) {
    yield event as any;
  }
}

async function readSSE(response: Response): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

describe("adkEventStream", () => {
  it("does not advance the generator before the response is read", async () => {
    let produced = 0;
    async function* events() {
      for (let index = 0; index < 1000; index++) {
        produced++;
        yield { id: String(index) };
      }
    }
    const response = adkEventStream(events());
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      expect(produced).toBe(0);
    } finally {
      await response.body!.cancel();
    }
  });

  it("buffers at most one event ahead of a slow reader", async () => {
    let produced = 0;
    async function* events() {
      for (let index = 0; index < 1000; index++) {
        produced++;
        yield { id: String(index) };
      }
    }
    const reader = adkEventStream(events()).body!.getReader();
    try {
      expect(new TextDecoder().decode((await reader.read()).value)).toBe(
        ":ok\n\n",
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(produced).toBe(1);
      expect(new TextDecoder().decode((await reader.read()).value)).toContain(
        '"id":"0"',
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(produced).toBe(2);
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
  });

  it("finalizes the generator when the reader cancels between events", async () => {
    const finalized = vi.fn();
    const onError = vi.fn();
    async function* events() {
      try {
        while (true) yield { id: "event" };
      } finally {
        finalized();
      }
    }
    const reader = adkEventStream(events(), { onError }).body!.getReader();
    await reader.read();
    await reader.read();
    await reader.cancel();
    expect(finalized).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
    expect(await reader.read()).toEqual({ done: true, value: undefined });
    reader.releaseLock();
  });

  it("delivers every event in order when the response is fully consumed", async () => {
    async function* events() {
      for (let index = 0; index < 1000; index++) yield { id: String(index) };
    }
    const text = await readSSE(adkEventStream(events()));
    const ids = text
      .split("\n\n")
      .filter((line) => line.startsWith("data: "))
      .map((line) => JSON.parse(line.slice(6)).id);
    expect(ids).toEqual(
      Array.from({ length: 1000 }, (_, index) => String(index)),
    );
  });

  it("allows onError to cancel the reader without writing to the closed stream", async () => {
    let reader: ReadableStreamDefaultReader<Uint8Array>;
    let cancelled: Promise<void> | undefined;
    async function* events() {
      throw new Error("stream failed");
    }
    const response = adkEventStream(events(), {
      onError: () => {
        cancelled = reader.cancel();
      },
    });
    reader = response.body!.getReader();
    await reader.read();
    expect(await reader.read()).toEqual({ done: true, value: undefined });
    await cancelled;
    reader.releaseLock();
  });

  it.each(["yield", "finish", "reject"])(
    "does not write after cancellation while next() later %s",
    async (outcome) => {
      let release!: () => void;
      const waiting = new Promise<void>((resolve) => {
        release = resolve;
      });
      let started!: () => void;
      const entered = new Promise<void>((resolve) => {
        started = resolve;
      });
      const finalized = vi.fn();
      const onError = vi.fn();
      async function* events() {
        try {
          started();
          await waiting;
          if (outcome === "reject") throw new Error("late error");
          if (outcome === "yield") yield { id: "late" };
        } finally {
          finalized();
        }
      }
      const reader = adkEventStream(events(), { onError }).body!.getReader();
      await reader.read();
      await entered;
      const cancelled = reader.cancel();
      release();
      await cancelled;
      expect(finalized).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
      expect(await reader.read()).toEqual({ done: true, value: undefined });
      reader.releaseLock();
    },
  );

  it("finalizes the source and emits an error frame if event serialization fails", async () => {
    const finalized = vi.fn();
    const onError = vi.fn();
    async function* events() {
      try {
        yield { id: "invalid", customMetadata: { unsupported: 1n } };
      } finally {
        finalized();
      }
    }
    const text = await readSSE(adkEventStream(events(), { onError }));
    expect(text).toContain('"errorCode":"STREAM_ERROR"');
    expect(finalized).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("returns a Response with text/event-stream content-type", () => {
    const response = adkEventStream(yieldEvents([]));
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
  });

  it("returns Cache-Control: no-cache header", () => {
    const response = adkEventStream(yieldEvents([]));
    expect(response.headers.get("Cache-Control")).toBe("no-cache");
  });

  it("emits an initial :ok SSE comment", async () => {
    const response = adkEventStream(yieldEvents([]));
    const text = await readSSE(response);
    expect(text).toMatch(/^:ok\n\n/);
  });

  it("serializes events as SSE data lines", async () => {
    const events = [
      { id: "e1", content: { parts: [{ text: "hello" }] } },
      { id: "e2", content: { parts: [{ text: "world" }] } },
    ];
    const response = adkEventStream(yieldEvents(events));
    const text = await readSSE(response);
    const lines = text.split("\n\n").filter((l) => l.startsWith("data: "));
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!.slice(6))).toMatchObject({ id: "e1" });
    expect(JSON.parse(lines[1]!.slice(6))).toMatchObject({ id: "e2" });
  });

  it("emits an error event when the generator throws", async () => {
    async function* throwingGen() {
      throw new Error("Test error");
    }
    const response = adkEventStream(throwingGen() as any);
    const text = await readSSE(response);
    const lines = text.split("\n\n").filter((l) => l.startsWith("data: "));
    expect(lines).toHaveLength(1);
    const errorEvent = JSON.parse(lines[0]!.slice(6));
    expect(errorEvent).toMatchObject({
      errorCode: "STREAM_ERROR",
      errorMessage: "Test error",
    });
  });

  it("calls onError callback when the generator throws", async () => {
    const onError = vi.fn();
    async function* throwingGen() {
      throw new Error("Test error");
    }
    const response = adkEventStream(throwingGen() as any, { onError });
    await readSSE(response);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      "throws",
      () => {
        throw new Error("callback failed");
      },
    ],
    [
      "rejects",
      async () => {
        throw new Error("callback failed");
      },
    ],
  ])(
    "still emits the stream error when onError %s",
    async (_behavior, onError) => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      async function* throwingGen() {
        throw new Error("stream failed");
      }

      try {
        const response = adkEventStream(throwingGen() as any, { onError });
        const text = await readSSE(response);
        await vi.waitFor(() => expect(errorSpy).toHaveBeenCalledTimes(1));

        const lines = text.split("\n\n").filter((l) => l.startsWith("data: "));
        expect(lines).toHaveLength(1);
        expect(JSON.parse(lines[0]!.slice(6))).toMatchObject({
          errorCode: "STREAM_ERROR",
          errorMessage: "stream failed",
        });
      } finally {
        errorSpy.mockRestore();
      }
    },
  );
});

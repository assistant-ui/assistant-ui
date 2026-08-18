import { afterEach, describe, expect, it, vi } from "vitest";
import { SSEDecoder, SSEEncoder, SSEMessageDecoder } from "./SSE";

afterEach(() => {
  vi.restoreAllMocks();
});

async function collectChunks<T>(stream: ReadableStream<T>): Promise<T[]> {
  const reader = stream.getReader();
  const chunks: T[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return chunks;
}

function createSSEStream(messages: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const sseText = messages.map((m) => `data: ${m}\n\n`).join("");
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(sseText));
      controller.close();
    },
  });
}

describe("SSEDecoder", () => {
  it("decodes message events as JSON", async () => {
    const chunks = await collectChunks(
      createSSEStream([
        JSON.stringify({ hello: "world" }),
        JSON.stringify([1, 2, 3]),
      ]).pipeThrough(new SSEDecoder()),
    );
    expect(chunks).toEqual([{ hello: "world" }, [1, 2, 3]]);
  });

  it("round-trips values through SSEEncoder and SSEDecoder", async () => {
    type V = { hello: string } | number[];
    const values: V[] = [{ hello: "world" }, [1, 2, 3]];
    const source = new ReadableStream<V>({
      start(controller) {
        for (const v of values) controller.enqueue(v);
        controller.close();
      },
    });
    const decoded = await collectChunks(
      source.pipeThrough(new SSEEncoder<V>()).pipeThrough(new SSEDecoder<V>()),
    );
    expect(decoded).toEqual(values);
  });

  it("drops frames carrying prototype-pollution keys", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const chunks = await collectChunks(
      createSSEStream([
        '{"__proto__":{"polluted":true},"ok":1}',
        '{"constructor":{"prototype":{"polluted":true}},"ok":2}',
        JSON.stringify({ ok: 3 }),
      ]).pipeThrough(new SSEDecoder()),
    );
    expect(warn).toHaveBeenCalledTimes(2);
    expect(chunks).toEqual([{ ok: 3 }]);
    warn.mockRestore();
  });

  it("drops frames that are not valid JSON", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const invalid = ["{not json", "not json"];
    const chunks = await collectChunks(
      createSSEStream([...invalid, JSON.stringify({ ok: 1 })]).pipeThrough(
        new SSEDecoder(),
      ),
    );
    expect(warn.mock.calls.map((c) => c[0])).toEqual(
      invalid.map((m) => `Dropped invalid SSE message: ${m}`),
    );
    expect(chunks).toEqual([{ ok: 1 }]);
    warn.mockRestore();
  });

  it("errors the stream on an unknown event type", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("event: custom\ndata: x\n\n"));
        controller.close();
      },
    });
    await expect(
      collectChunks(stream.pipeThrough(new SSEDecoder())),
    ).rejects.toThrow("Unknown SSE event type: custom");
  });

  it("ignores unknown event types with strict: false", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode('event: custom\ndata: x\n\ndata: {"ok":1}\n\n'),
        );
        controller.close();
      },
    });
    const chunks = await collectChunks(
      stream.pipeThrough(new SSEDecoder({ strict: false })),
    );
    expect(chunks).toEqual([{ ok: 1 }]);
    expect(error).toHaveBeenCalledWith(
      "Ignored unknown SSE event type: custom",
    );
    error.mockRestore();
  });
});

describe("SSEEncoder doneSentinel", () => {
  const encodeAll = async <T>(values: T[], encoder: SSEEncoder<T>) => {
    const source = new ReadableStream<T>({
      start(controller) {
        for (const v of values) controller.enqueue(v);
        controller.close();
      },
    });
    const bytes = await collectChunks(source.pipeThrough(encoder));
    return new TextDecoder().decode(
      new Uint8Array(bytes.flatMap((b) => [...b])),
    );
  };

  it("writes the sentinel verbatim after the last chunk", async () => {
    const text = await encodeAll(
      [{ ok: 1 }],
      new SSEEncoder<{ ok: number }>({ doneSentinel: "[DONE]" }),
    );
    expect(text).toBe('data: {"ok":1}\n\ndata: [DONE]\n\n');
  });

  it("writes the sentinel on an empty stream", async () => {
    const text = await encodeAll(
      [],
      new SSEEncoder<{ ok: number }>({ doneSentinel: "[DONE]" }),
    );
    expect(text).toBe("data: [DONE]\n\n");
  });

  it("writes no trailer without a sentinel", async () => {
    const text = await encodeAll([{ ok: 1 }], new SSEEncoder<{ ok: number }>());
    expect(text).toBe('data: {"ok":1}\n\n');
  });
});

describe("SSEMessageDecoder sentinel", () => {
  const passthrough = (
    data: string,
    controller: TransformStreamDefaultController<string>,
  ) => controller.enqueue(data);

  it("terminates on the sentinel", async () => {
    const chunks = await collectChunks(
      createSSEStream(["a", "[DONE]"]).pipeThrough(
        new SSEMessageDecoder<string>({
          doneSentinel: "[DONE]",
          onMessage: passthrough,
        }),
      ),
    );
    expect(chunks).toEqual(["a"]);
  });

  it("runs onDone before terminating, so flushed chunks land in the output", async () => {
    const chunks = await collectChunks(
      createSSEStream(["a", "[DONE]", "b"]).pipeThrough(
        new SSEMessageDecoder<string>({
          doneSentinel: "[DONE]",
          onMessage: passthrough,
          onDone(controller) {
            controller.enqueue("pending-1");
            controller.enqueue("pending-2");
          },
        }),
      ),
    );
    expect(chunks).toEqual(["a", "pending-1", "pending-2"]);
  });

  it("does not run onDone when the stream ends without the sentinel", async () => {
    const onDone = vi.fn();
    await expect(
      collectChunks(
        createSSEStream(["a"]).pipeThrough(
          new SSEMessageDecoder<string>({
            doneSentinel: "[DONE]",
            onMessage: passthrough,
            onDone,
          }),
        ),
      ),
    ).rejects.toThrow("Stream ended abruptly without receiving [DONE] marker");
    expect(onDone).not.toHaveBeenCalled();
  });

  it("treats the sentinel as data when no sentinel is configured", async () => {
    const chunks = await collectChunks(
      createSSEStream(["a", "[DONE]"]).pipeThrough(
        new SSEMessageDecoder<string>({ onMessage: passthrough }),
      ),
    );
    expect(chunks).toEqual(["a", "[DONE]"]);
  });
});

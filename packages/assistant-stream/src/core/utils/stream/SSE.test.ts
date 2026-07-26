import { describe, expect, it, vi } from "vitest";
import { SSEDecoder, SSEEncoder } from "./SSE";

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
});

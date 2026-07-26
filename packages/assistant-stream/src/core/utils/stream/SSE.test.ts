import { describe, expect, it } from "vitest";
import { SSEDecoder, SSEEncoder } from "./SSE";

const decode = async <T>(events: string[]): Promise<T[]> => {
  const encoded = events.map((e) => new TextEncoder().encode(e));
  const stream = new ReadableStream<Uint8Array<ArrayBuffer>>({
    start(controller) {
      for (const chunk of encoded) controller.enqueue(chunk);
      controller.close();
    },
  }).pipeThrough(new SSEDecoder<T>());

  const out: T[] = [];
  for await (const value of stream as unknown as AsyncIterable<T>) {
    out.push(value);
  }
  return out;
};

describe("SSEDecoder", () => {
  it("decodes a JSON message frame", async () => {
    const out = await decode<{ hello: string }>([`data: {"hello":"world"}\n\n`]);
    expect(out).toEqual([{ hello: "world" }]);
  });

  it("does not decode __proto__ as an own property", async () => {
    const [value] = await decode<Record<string, unknown>>([
      `data: {"__proto__":{"polluted":true}}\n\n`,
    ]);
    expect(Object.prototype.hasOwnProperty.call(value, "__proto__")).toBe(
      false,
    );
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("does not pollute the prototype via constructor.prototype", async () => {
    await decode([
      `data: {"constructor":{"prototype":{"polluted":true}}}\n\n`,
    ]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("errors the stream on malformed JSON", async () => {
    await expect(decode([`data: {not json}\n\n`])).rejects.toThrow();
  });

  it("round-trips through the encoder", async () => {
    const encoded = new ReadableStream<{ n: number }>({
      start(controller) {
        controller.enqueue({ n: 1 });
        controller.close();
      },
    }).pipeThrough(new SSEEncoder<{ n: number }>());

    const decoded = encoded.pipeThrough(new SSEDecoder<{ n: number }>());
    const out: { n: number }[] = [];
    for await (const value of decoded as unknown as AsyncIterable<{
      n: number;
    }>) {
      out.push(value);
    }
    expect(out).toEqual([{ n: 1 }]);
  });
});

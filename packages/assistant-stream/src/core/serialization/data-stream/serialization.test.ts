import { describe, expect, it } from "vitest";
import { DataStreamChunkDecoder } from "./serialization";
import type { DataStreamChunk } from "./chunk-types";

const decode = async (lines: string[]): Promise<DataStreamChunk[]> => {
  const stream = new ReadableStream<string>({
    start(controller) {
      for (const line of lines) controller.enqueue(line);
      controller.close();
    },
  }).pipeThrough(new DataStreamChunkDecoder());

  const out: DataStreamChunk[] = [];
  for await (const chunk of stream as unknown as AsyncIterable<DataStreamChunk>) {
    out.push(chunk);
  }
  return out;
};

describe("DataStreamChunkDecoder", () => {
  it("decodes a chunk into type and value", async () => {
    const [chunk] = await decode([
      `9:{"toolCallId":"1","toolName":"x","args":{}}`,
    ]);
    expect(chunk).toEqual({
      type: "9",
      value: { toolCallId: "1", toolName: "x", args: {} },
    });
  });

  it("does not decode __proto__ as an own property", async () => {
    const [chunk] = await decode([`2:{"__proto__":{"polluted":true}}`]);
    expect(Object.prototype.hasOwnProperty.call(chunk.value, "__proto__")).toBe(
      false,
    );
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("does not pollute the prototype via constructor.prototype", async () => {
    await decode([`2:{"constructor":{"prototype":{"polluted":true}}}`]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("throws on a chunk without a type separator", async () => {
    await expect(decode([`no-separator`])).rejects.toThrow(
      "Invalid stream part",
    );
  });

  it("errors the stream on malformed JSON", async () => {
    await expect(decode([`2:{not json}`])).rejects.toThrow();
  });
});

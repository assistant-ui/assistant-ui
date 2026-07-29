import { afterEach, describe, expect, it, vi } from "vitest";
import { LineDecoderStream } from "../../utils/stream/LineDecoderStream";
import {
  DataStreamChunkDecoder,
  DataStreamChunkEncoder,
} from "./serialization";
import { type DataStreamChunk, DataStreamStreamChunkType } from "./chunk-types";

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

function createLineStream(lines: string[]): ReadableStream<string> {
  return new ReadableStream<string>({
    start(controller) {
      for (const line of lines) controller.enqueue(line);
      controller.close();
    },
  });
}

describe("DataStreamChunkDecoder", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("decodes text-delta chunks", async () => {
    const chunks = await collectChunks(
      createLineStream(['0:"hello"', '0:" world"']).pipeThrough(
        new DataStreamChunkDecoder(),
      ),
    );
    expect(chunks).toEqual([
      { type: DataStreamStreamChunkType.TextDelta, value: "hello" },
      { type: DataStreamStreamChunkType.TextDelta, value: " world" },
    ]);
  });

  it("round-trips through DataStreamChunkEncoder", async () => {
    const values: DataStreamChunk[] = [
      { type: DataStreamStreamChunkType.TextDelta, value: "hello" },
      { type: DataStreamStreamChunkType.Error, value: "boom" },
    ];
    const source = new ReadableStream<DataStreamChunk>({
      start(controller) {
        for (const v of values) controller.enqueue(v);
        controller.close();
      },
    });
    const decoded = await collectChunks(
      source
        .pipeThrough(new DataStreamChunkEncoder())
        .pipeThrough(new LineDecoderStream())
        .pipeThrough(new DataStreamChunkDecoder()),
    );
    expect(decoded).toEqual(values);
  });

  it("drops chunks carrying prototype-pollution keys", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const chunks = await collectChunks(
      createLineStream([
        '0:{"__proto__":{"polluted":true}}',
        '0:{"constructor":{"prototype":{"polluted":true}}}',
        '0:"ok"',
      ]).pipeThrough(new DataStreamChunkDecoder()),
    );
    expect(warn).toHaveBeenCalledTimes(2);
    expect(chunks).toEqual([
      { type: DataStreamStreamChunkType.TextDelta, value: "ok" },
    ]);
  });

  it("drops chunks that are not valid JSON", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const invalid = ["0:{not json", "0:not json"];
    const chunks = await collectChunks(
      createLineStream([...invalid, '0:"ok"']).pipeThrough(
        new DataStreamChunkDecoder(),
      ),
    );
    expect(warn.mock.calls.map((c) => c[0])).toEqual(
      invalid.map((l) => `Dropped invalid data-stream chunk: ${l}`),
    );
    expect(chunks).toEqual([
      { type: DataStreamStreamChunkType.TextDelta, value: "ok" },
    ]);
  });

  it("skips blank and whitespace-only lines silently", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const chunks = await collectChunks(
      createLineStream([
        "",
        '0:"hello"',
        "   ",
        "\t",
        '0:" world"',
      ]).pipeThrough(new DataStreamChunkDecoder()),
    );
    expect(warn).not.toHaveBeenCalled();
    expect(chunks).toEqual([
      { type: DataStreamStreamChunkType.TextDelta, value: "hello" },
      { type: DataStreamStreamChunkType.TextDelta, value: " world" },
    ]);
  });

  it("drops a chunk without a colon separator with a warning", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const chunks = await collectChunks(
      createLineStream(["garbage", '0:"ok"']).pipeThrough(
        new DataStreamChunkDecoder(),
      ),
    );
    expect(warn).toHaveBeenCalledWith(
      "Dropped invalid data-stream chunk: garbage",
    );
    expect(chunks).toEqual([
      { type: DataStreamStreamChunkType.TextDelta, value: "ok" },
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { DataStreamEncoder, DataStreamDecoder } from "./DataStream";
import { AssistantStreamChunk } from "../../AssistantStreamChunk";

// Helper function to collect all chunks from a stream
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

// Helper function to encode and decode a stream
async function encodeAndDecode(
  stream: ReadableStream<AssistantStreamChunk>,
): Promise<ReadableStream<AssistantStreamChunk>> {
  // Encode the stream to Uint8Array (simulating network transmission)
  const encodedStream = stream.pipeThrough(new DataStreamEncoder());

  // Collect all encoded chunks
  const encodedChunks = await collectChunks(encodedStream);

  // Create a new stream from the encoded chunks
  const reconstructedStream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of encodedChunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

  // Decode the reconstructed stream
  return reconstructedStream.pipeThrough(new DataStreamDecoder());
}

describe("DataStreamEncoder", () => {
  it("should encode timing chunks to wire format", async () => {
    const chunks: AssistantStreamChunk[] = [
      {
        type: "timing",
        path: [],
        timing: {
          processingTime: 100,
          queueTime: 50,
          custom: { model: "gpt-4" },
        },
      },
    ];

    const stream = new ReadableStream<AssistantStreamChunk>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    const encodedStream = stream.pipeThrough(new DataStreamEncoder());
    const encodedChunks = await collectChunks(encodedStream);

    // Decode the chunks to verify format
    const decoder = new TextDecoder();
    const text = encodedChunks.map((chunk) => decoder.decode(chunk)).join("");

    // Should contain aui-timing formatted data (for native clients)
    expect(text).toContain("aui-timing:");
    expect(text).toContain('"processingTime":100');
    expect(text).toContain('"queueTime":50');
    expect(text).toContain('"model":"gpt-4"');

    // Should also contain annotation (for AI SDK compatibility)
    expect(text).toContain("8:");
    expect(text).toContain('"type":"aui-timing"');
  });

  it("should set correct headers", () => {
    const encoder = new DataStreamEncoder();
    expect(encoder.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(encoder.headers.get("x-vercel-ai-data-stream")).toBe("v1");
  });
});

describe("DataStreamDecoder", () => {
  it("should decode timing chunks from wire format", async () => {
    const encoder = new TextEncoder();
    const wireData =
      'aui-timing:{"processingTime":100,"queueTime":50,"custom":{"model":"gpt-4"}}\n';

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(wireData));
        controller.close();
      },
    });

    const decodedStream = stream.pipeThrough(new DataStreamDecoder());
    const decodedChunks = await collectChunks(decodedStream);

    expect(decodedChunks).toHaveLength(1);
    expect(decodedChunks[0]).toEqual({
      type: "timing",
      path: [],
      timing: {
        processingTime: 100,
        queueTime: 50,
        custom: { model: "gpt-4" },
      },
    });
  });

  it("should ignore unknown chunk types for forward compatibility", async () => {
    const encoder = new TextEncoder();
    const wireData =
      'aui-timing:{"processingTime":100}\n' +
      'unknown-future-type:{"foo":"bar"}\n' +
      'aui-timing:{"queueTime":50}\n';

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(wireData));
        controller.close();
      },
    });

    const decodedStream = stream.pipeThrough(new DataStreamDecoder());
    const decodedChunks = await collectChunks(decodedStream);

    // Should only have timing chunks, unknown type is ignored
    expect(decodedChunks).toHaveLength(2);
    expect(decodedChunks[0]).toEqual({
      type: "timing",
      path: [],
      timing: { processingTime: 100 },
    });
    expect(decodedChunks[1]).toEqual({
      type: "timing",
      path: [],
      timing: { queueTime: 50 },
    });
  });
});

describe("DataStream round-trip", () => {
  it("should preserve timing data through encode/decode cycle", async () => {
    const originalTiming = {
      processingTime: 250,
      queueTime: 30,
      custom: { provider: "anthropic", requestId: "req_123" },
    };

    const chunks: AssistantStreamChunk[] = [
      {
        type: "timing",
        path: [],
        timing: originalTiming,
      },
    ];

    const stream = new ReadableStream<AssistantStreamChunk>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    const decodedStream = await encodeAndDecode(stream);
    const decodedChunks = await collectChunks(decodedStream);

    expect(decodedChunks).toHaveLength(2);
    expect(decodedChunks[0]).toEqual({
      type: "timing",
      path: [],
      timing: originalTiming,
    });
    expect(decodedChunks[1]).toEqual({
      type: "annotations",
      path: [],
      annotations: [{ type: "aui-timing", ...originalTiming }],
    });
  });

  it("should handle timing with partial fields", async () => {
    const partialTiming = {
      processingTime: 100,
    };

    const chunks: AssistantStreamChunk[] = [
      {
        type: "timing",
        path: [],
        timing: partialTiming,
      },
    ];

    const stream = new ReadableStream<AssistantStreamChunk>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    const decodedStream = await encodeAndDecode(stream);
    const decodedChunks = await collectChunks(decodedStream);

    expect(decodedChunks).toHaveLength(2);
    expect(decodedChunks[0]).toEqual({
      type: "timing",
      path: [],
      timing: partialTiming,
    });
    expect(decodedChunks[1]).toEqual({
      type: "annotations",
      path: [],
      annotations: [{ type: "aui-timing", ...partialTiming }],
    });
  });
});

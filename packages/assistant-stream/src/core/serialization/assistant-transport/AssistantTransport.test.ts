import { describe, expect, it } from "vitest";
import {
  AssistantTransportEncoder,
  AssistantTransportDecoder,
} from "./AssistantTransport";
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
  const encodedStream = stream.pipeThrough(new AssistantTransportEncoder());

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
  return reconstructedStream.pipeThrough(new AssistantTransportDecoder());
}

describe("AssistantTransportEncoder", () => {
  it("should encode text-delta chunks to SSE format", async () => {
    const chunks: AssistantStreamChunk[] = [
      { type: "text-delta", textDelta: "Hello", path: [] },
      { type: "text-delta", textDelta: " world", path: [] },
    ];

    const stream = new ReadableStream<AssistantStreamChunk>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    const encodedStream = stream.pipeThrough(new AssistantTransportEncoder());
    const encodedChunks = await collectChunks(encodedStream);

    // Decode the chunks to verify format
    const decoder = new TextDecoder();
    const text = encodedChunks.map((chunk) => decoder.decode(chunk)).join("");

    // Should contain SSE formatted data
    expect(text).toContain('data: {"type":"text-delta"');
    expect(text).toContain('"textDelta":"Hello"');
    expect(text).toContain('"textDelta":" world"');
    // Should end with [DONE]
    expect(text).toContain("data: [DONE]");
  });

  it("should set correct headers", () => {
    const encoder = new AssistantTransportEncoder();
    expect(encoder.headers.get("Content-Type")).toBe("text/event-stream");
    expect(encoder.headers.get("Cache-Control")).toBe("no-cache");
    expect(encoder.headers.get("Connection")).toBe("keep-alive");
  });
});

describe("AssistantTransportDecoder", () => {
  it("should decode SSE format back to chunks", async () => {
    const originalChunks: AssistantStreamChunk[] = [
      { type: "text-delta", textDelta: "Hello", path: [] },
      { type: "text-delta", textDelta: " world", path: [] },
    ];

    const stream = new ReadableStream<AssistantStreamChunk>({
      start(controller) {
        for (const chunk of originalChunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    const decodedStream = await encodeAndDecode(stream);
    const decodedChunks = await collectChunks(decodedStream);

    expect(decodedChunks).toEqual(originalChunks);
  });

  it("should stop decoding at [DONE]", async () => {
    // Manually create an SSE stream with [DONE] in the middle
    const sseText =
      'data: {"type":"text-delta","textDelta":"Hello","path":[]}\n\n' +
      "data: [DONE]\n\n" +
      'data: {"type":"text-delta","textDelta":"Should not appear","path":[]}\n\n';

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(sseText));
        controller.close();
      },
    });

    const decodedStream = stream.pipeThrough(new AssistantTransportDecoder());
    const decodedChunks = await collectChunks(decodedStream);

    // Should only have the chunk before [DONE]
    expect(decodedChunks).toHaveLength(1);
    expect(decodedChunks[0]).toEqual({
      type: "text-delta",
      textDelta: "Hello",
      path: [],
    });
  });

  it("should handle part-start chunks", async () => {
    const originalChunks: AssistantStreamChunk[] = [
      {
        type: "part-start",
        part: { type: "text" },
        path: [],
      },
      { type: "text-delta", textDelta: "Hello", path: [] },
      { type: "part-finish", path: [] },
    ];

    const stream = new ReadableStream<AssistantStreamChunk>({
      start(controller) {
        for (const chunk of originalChunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    const decodedStream = await encodeAndDecode(stream);
    const decodedChunks = await collectChunks(decodedStream);

    expect(decodedChunks).toEqual(originalChunks);
  });

  it("should throw error when stream ends without [DONE]", async () => {
    // Manually create an SSE stream without [DONE]
    const sseText =
      'data: {"type":"text-delta","textDelta":"Hello","path":[]}\n\n' +
      'data: {"type":"text-delta","textDelta":" world","path":[]}\n\n';

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(sseText));
        controller.close();
      },
    });

    const decodedStream = stream.pipeThrough(new AssistantTransportDecoder());

    // Should throw when trying to collect all chunks
    await expect(collectChunks(decodedStream)).rejects.toThrow(
      "Stream ended abruptly without receiving [DONE] marker",
    );
  });
});

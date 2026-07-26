import { describe, expect, it, vi } from "vitest";
import {
  AssistantTransportEncoder,
  AssistantTransportDecoder,
} from "./AssistantTransport";
import type { AssistantStreamChunk } from "../../AssistantStreamChunk";

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

function sseStream(frames: string[]): ReadableStream<AssistantStreamChunk> {
  const sseText =
    frames.map((frame) => `data: ${frame}\n\n`).join("") + "data: [DONE]\n\n";

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(sseText));
      controller.close();
    },
  }).pipeThrough(new AssistantTransportDecoder());
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

  it("should decode SSE with CRLF line endings", async () => {
    // Simulate a server that uses \r\n line endings (common in HTTP)
    const sseText =
      'data: {"type":"text-delta","textDelta":"Hello","path":[]}\r\n\r\n' +
      "data: [DONE]\r\n\r\n";

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(sseText));
        controller.close();
      },
    });

    const decodedStream = stream.pipeThrough(new AssistantTransportDecoder());
    const decodedChunks = await collectChunks(decodedStream);

    expect(decodedChunks).toHaveLength(1);
    expect(decodedChunks[0]).toEqual({
      type: "text-delta",
      textDelta: "Hello",
      path: [],
    });
  });

  it("should discard an unterminated [DONE] event", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n"));
        controller.close();
      },
    });

    const decodedStream = stream.pipeThrough(new AssistantTransportDecoder());

    await expect(collectChunks(decodedStream)).rejects.toThrow(
      "Stream ended abruptly without receiving [DONE] marker",
    );
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

  it("drops frames that are not objects", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const decodedChunks = await collectChunks(
      sseStream([
        "null",
        "5",
        '"text"',
        "[1,2]",
        '{"type":"text-delta","textDelta":"Hello","path":[]}',
      ]),
    );

    expect(decodedChunks).toEqual([
      { type: "text-delta", textDelta: "Hello", path: [] },
    ]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("(not-an-object)"),
    );
    warn.mockRestore();
  });

  it("drops frames with a missing or unknown type", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const decodedChunks = await collectChunks(
      sseStream([
        '{"path":[]}',
        '{"type":5,"path":[]}',
        '{"type":"bogus","path":[]}',
        '{"type":"toString","path":[]}',
        '{"type":"part-finish","path":[]}',
      ]),
    );

    expect(decodedChunks).toEqual([{ type: "part-finish", path: [] }]);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("drops frames with an invalid path", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const decodedChunks = await collectChunks(
      sseStream([
        '{"type":"text-delta","textDelta":"b","path":"0"}',
        '{"type":"text-delta","textDelta":"c","path":[-1]}',
        '{"type":"text-delta","textDelta":"d","path":[1.5]}',
        '{"type":"text-delta","textDelta":"e","path":["0"]}',
        '{"type":"text-delta","textDelta":"f","path":[0]}',
      ]),
    );

    expect(decodedChunks).toEqual([
      { type: "text-delta", textDelta: "f", path: [0] },
    ]);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("normalizes a missing path to an empty path on message-level chunks", async () => {
    const decodedChunks = await collectChunks(
      sseStream([
        '{"type":"update-state","operations":[{"type":"set","path":["messages"],"value":[]}]}',
        '{"type":"error","error":"boom"}',
      ]),
    );

    expect(decodedChunks).toEqual([
      {
        type: "update-state",
        operations: [{ type: "set", path: ["messages"], value: [] }],
        path: [],
      },
      { type: "error", error: "boom", path: [] },
    ]);
  });

  it("drops part-addressed chunks with a missing path", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const decodedChunks = await collectChunks(
      sseStream([
        '{"type":"text-delta","textDelta":"a"}',
        '{"type":"part-finish"}',
        '{"type":"result","result":{"ok":true}}',
        '{"type":"text-delta","textDelta":"ok","path":[0]}',
      ]),
    );

    expect(decodedChunks).toEqual([
      { type: "text-delta", textDelta: "ok", path: [0] },
    ]);
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
  });

  it("drops frames that are not valid JSON", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const decodedChunks = await collectChunks(
      sseStream([
        '{"type":"text-delta"',
        "not json",
        '{"type":"text-delta","textDelta":"ok","path":[0]}',
      ]),
    );

    expect(decodedChunks).toEqual([
      { type: "text-delta", textDelta: "ok", path: [0] },
    ]);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("drops frames missing per-type required fields", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const decodedChunks = await collectChunks(
      sseStream([
        '{"type":"part-start","path":[]}',
        '{"type":"part-start","part":[],"path":[]}',
        '{"type":"text-delta","textDelta":5,"path":[0]}',
        '{"type":"annotations","path":[]}',
        '{"type":"data","path":[]}',
        '{"type":"update-state","path":[]}',
        '{"type":"message-finish","path":[]}',
        '{"type":"step-finish","path":[]}',
        '{"type":"error","path":[]}',
        '{"type":"error","error":42,"path":[]}',
        '{"type":"message-finish","finishReason":"stop","path":[]}',
        '{"type":"error","error":"boom","path":[]}',
      ]),
    );

    expect(decodedChunks).toEqual([
      { type: "error", path: [] },
      { type: "error", error: 42, path: [] },
      { type: "message-finish", finishReason: "stop", path: [] },
      { type: "error", error: "boom", path: [] },
    ]);
    expect(warn).toHaveBeenCalledTimes(7);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("(invalid-fields:part-start)"),
    );
    warn.mockRestore();
  });

  it("tolerates a result without isError or result but rejects a non-boolean isError", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const decodedChunks = await collectChunks(
      sseStream([
        '{"type":"result","result":null,"path":[0]}',
        '{"type":"result","path":[0]}',
        '{"type":"result","result":1,"isError":"no","path":[0]}',
      ]),
    );

    expect(decodedChunks).toEqual([
      { type: "result", result: null, path: [0] },
      { type: "result", path: [0] },
    ]);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("round-trips error chunks with code and severity", async () => {
    const originalChunks: AssistantStreamChunk[] = [
      {
        type: "error",
        path: [],
        error: "rate limited",
        code: "provider",
        severity: "warning",
      },
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
});

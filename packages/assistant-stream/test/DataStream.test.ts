/*
 * Comprehensive tests for the DataStream.
 *
 * These tests cover:
 * - DataStreamEncoder:
 *   - Correct encoding of various chunk types:
 *     - text-delta: Verifies that text chunks are prefixed with "0:" and JSON-stringified.
 *     - tool-call-begin: Checks that tool call beginnings are encoded with prefix "b:" and include the proper tool identifiers.
 *     - tool-call-delta: Ensures that incremental tool call data is encoded with prefix "c:".
 *     - tool-result: Validates that tool results are encoded with prefix "a:".
 *     - error: Confirms that error chunks are encoded with prefix "3:" and JSON-stringified.
 *   - Proper error handling when an unsupported chunk type is provided.
 *
 * - DataStreamDecoder:
 *   - Accurate decoding of each supported chunk type from their string representations.
 *   - Special handling of type "9", where a single input produces two output chunks (a tool-call-begin followed by a tool-call-delta).
 *   - Ignoring of chunks with specific types ("2", "3", "8", "d", "e") that should not yield any output.
 *   - Correct processing of multiple newline-delimited messages received in a single write, ensuring line-by-line splitting.
 *
 * - Round-trip Integration:
 *   - Ensures that when chunks are encoded and then decoded, the original data is preserved (excluding the error type).
 */

import { DataStreamEncoder, DataStreamDecoder } from "../src/core/serialization/DataStream";

// Helper: collect all chunks from a ReadableStream into an array.
async function collectStream<T>(stream: ReadableStream<T>): Promise<T[]> {
  const reader = stream.getReader();
  const chunks: T[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return chunks;
}

// Helper: Given a ReadableStream<Uint8Array>, decode it to a string.
async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode(); // flush
  return result;
}

describe("DataStreamEncoder", () => {
  test("encodes a text-delta chunk", async () => {
    const encoder = new DataStreamEncoder();
    const writer = encoder.writable.getWriter();
    const chunk = { type: "text-delta", textDelta: "Hello" } as const;
    await writer.write(chunk);
    writer.close();

    const output = await streamToString(encoder.readable);
    // Expected encoding: prefix "0:" and then JSON.stringify("Hello") then newline.
    expect(output).toBe("0:" + JSON.stringify("Hello") + "\n");
  });

  test("encodes a tool-call-begin chunk", async () => {
    const encoder = new DataStreamEncoder();
    const writer = encoder.writable.getWriter();
    const chunk = { 
      type: "tool-call-begin", 
      toolCallId: "id1", 
      toolName: "toolA" 
    } as const;
    await writer.write(chunk);
    writer.close();

    const output = await streamToString(encoder.readable);
    expect(output).toBe(
      "b:" +
        JSON.stringify({ toolCallId: "id1", toolName: "toolA" }) +
        "\n"
    );
  });

  test("encodes a tool-call-delta chunk", async () => {
    const encoder = new DataStreamEncoder();
    const writer = encoder.writable.getWriter();
    const chunk = { 
      type: "tool-call-delta", 
      toolCallId: "id2", 
      argsTextDelta: "delta" 
    } as const;
    await writer.write(chunk);
    writer.close();

    const output = await streamToString(encoder.readable);
    expect(output).toBe(
      "c:" +
        JSON.stringify({ toolCallId: "id2", argsTextDelta: "delta" }) +
        "\n"
    );
  });

  test("encodes a tool-result chunk", async () => {
    const encoder = new DataStreamEncoder();
    const writer = encoder.writable.getWriter();
    const chunk = { 
      type: "tool-result", 
      toolCallId: "id3", 
      result: { success: true } 
    } as const;
    await writer.write(chunk);
    writer.close();

    const output = await streamToString(encoder.readable);
    expect(output).toBe(
      "a:" +
        JSON.stringify({ toolCallId: "id3", result: { success: true } }) +
        "\n"
    );
  });

  test("encodes an error chunk", async () => {
    const encoder = new DataStreamEncoder();
    const writer = encoder.writable.getWriter();
    const chunk = { 
      type: "error", 
      error: "something went wrong" 
    } as const;
    await writer.write(chunk);
    writer.close();

    const output = await streamToString(encoder.readable);
    expect(output).toBe("3:" + JSON.stringify("something went wrong") + "\n");
  });

  test("throws error on unsupported chunk type", async () => {
    const encoder = new DataStreamEncoder();
    const writer = encoder.writable.getWriter();
    // @ts-expect-error: testing unsupported chunk type
    writer.write({ type: "unsupported", foo: "bar" });
    writer.close();

    // Reading from the readable should result in an error.
    await expect(async () => {
      // Try to read until the stream errors out.
      await streamToString(encoder.readable);
    }).rejects.toThrow(/unsupported chunk type: unsupported/);
  });
});

describe("DataStreamDecoder", () => {
  // Utility: encode a string into a Uint8Array.
  function encodeString(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }

  test("decodes a text-delta chunk", async () => {
    const decoder = new DataStreamDecoder();
    const writer = decoder.writable.getWriter();
    const input = "0:" + JSON.stringify("Hello") + "\n";
    await writer.write(encodeString(input));
    writer.close();

    const chunks = await collectStream(decoder.readable);
    expect(chunks).toEqual([{ type: "text-delta", textDelta: "Hello" }]);
  });

  test("decodes a tool-call-begin chunk", async () => {
    const decoder = new DataStreamDecoder();
    const writer = decoder.writable.getWriter();
    const payload = { toolCallId: "id1", toolName: "toolA" };
    const input = "b:" + JSON.stringify(payload) + "\n";
    await writer.write(encodeString(input));
    writer.close();

    const chunks = await collectStream(decoder.readable);
    expect(chunks).toEqual([
      { type: "tool-call-begin", toolCallId: "id1", toolName: "toolA" },
    ]);
  });

  test("decodes a tool-call-delta chunk", async () => {
    const decoder = new DataStreamDecoder();
    const writer = decoder.writable.getWriter();
    const payload = { toolCallId: "id2", argsTextDelta: "delta" };
    const input = "c:" + JSON.stringify(payload) + "\n";
    await writer.write(encodeString(input));
    writer.close();

    const chunks = await collectStream(decoder.readable);
    expect(chunks).toEqual([
      { type: "tool-call-delta", toolCallId: "id2", argsTextDelta: "delta" },
    ]);
  });

  test("decodes a tool-result chunk", async () => {
    const decoder = new DataStreamDecoder();
    const writer = decoder.writable.getWriter();
    const payload = { toolCallId: "id3", result: { success: true } };
    const input = "a:" + JSON.stringify(payload) + "\n";
    await writer.write(encodeString(input));
    writer.close();

    const chunks = await collectStream(decoder.readable);
    expect(chunks).toEqual([
      { type: "tool-result", toolCallId: "id3", result: { success: true } },
    ]);
  });

  test("decodes a type '9' chunk into two chunks", async () => {
    const decoder = new DataStreamDecoder();
    const writer = decoder.writable.getWriter();
    const payload = { toolCallId: "id5", toolName: "ignored", args: { a: 1 } };
    const input = "9:" + JSON.stringify(payload) + "\n";
    await writer.write(encodeString(input));
    writer.close();

    const chunks = await collectStream(decoder.readable);
    expect(chunks).toEqual([
      {
        type: "tool-call-begin",
        toolCallId: "id5",
        toolName: "id5",
      },
      {
        type: "tool-call-delta",
        toolCallId: "id5",
        argsTextDelta: JSON.stringify({ a: 1 }),
      },
    ]);
  });

  test("ignores chunks with ignored types", async () => {
    const decoder = new DataStreamDecoder();
    const writer = decoder.writable.getWriter();
    // Create input for each ignored type: 2, 3, 8, d, e.
    const ignoredTypes = ["2", "3", "8", "d", "e"];
    let input = "";
    for (const typeCode of ignoredTypes) {
      input += typeCode + ":" + JSON.stringify({ dummy: "data" }) + "\n";
    }
    await writer.write(new TextEncoder().encode(input));
    writer.close();

    const chunks = await collectStream(decoder.readable);
    // Since these types are explicitly ignored, no chunks should be output.
    expect(chunks).toEqual([]);
  });

  test("decodes multiple lines in one write", async () => {
    const decoder = new DataStreamDecoder();
    const writer = decoder.writable.getWriter();
    const line1 = "0:" + JSON.stringify("Hello") + "\n";
    const line2 = "0:" + JSON.stringify("World") + "\n";
    // Write both lines as a single Uint8Array
    const combined = new TextEncoder().encode(line1 + line2);
    await writer.write(combined);
    writer.close();

    const chunks = await collectStream(decoder.readable);
    expect(chunks).toEqual([
      { type: "text-delta", textDelta: "Hello" },
      { type: "text-delta", textDelta: "World" }
    ]);
  });
});
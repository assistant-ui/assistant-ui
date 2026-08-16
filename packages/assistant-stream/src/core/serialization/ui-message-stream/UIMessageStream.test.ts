import { describe, expect, it, vi } from "vitest";
import { UIMessageStreamDecoder } from "./UIMessageStream";
import type { AssistantStreamChunk } from "../../AssistantStreamChunk";
import { NO_RESULT } from "../../tool/ToolResponse";

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

// Helper function to create a UI Message Stream from events
function createUIMessageStream(events: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const sseText = events.map((e) => `data: ${e}\n\n`).join("");

  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(sseText));
      controller.close();
    },
  });
}

describe("UIMessageStreamDecoder", () => {
  it("should decode text deltas", async () => {
    const events = [
      JSON.stringify({ type: "start", messageId: "msg_123" }),
      JSON.stringify({ type: "text-start", id: "text_1" }),
      JSON.stringify({ type: "text-delta", id: "text_1", delta: "Hello" }),
      JSON.stringify({ type: "text-delta", id: "text_1", delta: " world" }),
      JSON.stringify({ type: "text-end" }),
      JSON.stringify({
        type: "finish",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5 },
      }),
      "[DONE]",
    ];

    const stream = createUIMessageStream(events);
    const decodedStream = stream.pipeThrough(new UIMessageStreamDecoder());
    const chunks = await collectChunks(decodedStream);

    const textDeltas = chunks.filter(
      (c): c is AssistantStreamChunk & { type: "text-delta" } =>
        c.type === "text-delta",
    );
    expect(textDeltas).toHaveLength(2);
    expect(textDeltas[0]?.textDelta).toBe("Hello");
    expect(textDeltas[1]?.textDelta).toBe(" world");
  });

  it("should decode legacy textDelta text deltas", async () => {
    const events = [
      JSON.stringify({ type: "start", messageId: "msg_123" }),
      JSON.stringify({ type: "text-start", id: "text_1" }),
      JSON.stringify({ type: "text-delta", textDelta: "Hello" }),
      JSON.stringify({ type: "text-delta", textDelta: " world" }),
      JSON.stringify({ type: "text-end" }),
      JSON.stringify({
        type: "finish",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5 },
      }),
      "[DONE]",
    ];

    const stream = createUIMessageStream(events);
    const decodedStream = stream.pipeThrough(new UIMessageStreamDecoder());
    const chunks = await collectChunks(decodedStream);

    // Find text-delta chunks
    const textDeltas = chunks.filter(
      (c): c is AssistantStreamChunk & { type: "text-delta" } =>
        c.type === "text-delta",
    );
    expect(textDeltas).toHaveLength(2);
    expect(textDeltas[0]?.textDelta).toBe("Hello");
    expect(textDeltas[1]?.textDelta).toBe(" world");
  });

  it("should decode reasoning parts", async () => {
    const events = [
      JSON.stringify({ type: "start", messageId: "msg_123" }),
      JSON.stringify({ type: "reasoning-start", id: "reasoning_1" }),
      JSON.stringify({ type: "reasoning-delta", delta: "Let me think..." }),
      JSON.stringify({ type: "reasoning-end" }),
      JSON.stringify({
        type: "finish",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5 },
      }),
      "[DONE]",
    ];

    const stream = createUIMessageStream(events);
    const decodedStream = stream.pipeThrough(new UIMessageStreamDecoder());
    const chunks = await collectChunks(decodedStream);

    // Find part-start for reasoning
    const partStarts = chunks.filter(
      (c): c is AssistantStreamChunk & { type: "part-start" } =>
        c.type === "part-start",
    );
    expect(partStarts.some((p) => p.part.type === "reasoning")).toBe(true);
  });

  it("should decode tool calls", async () => {
    const events = [
      JSON.stringify({ type: "start", messageId: "msg_123" }),
      JSON.stringify({
        type: "tool-call-start",
        id: "tc_1",
        toolCallId: "call_abc",
        toolName: "weather",
      }),
      JSON.stringify({ type: "tool-call-delta", argsText: '{"city":' }),
      JSON.stringify({ type: "tool-call-delta", argsText: '"NYC"}' }),
      JSON.stringify({ type: "tool-call-end" }),
      JSON.stringify({
        type: "tool-result",
        toolCallId: "call_abc",
        result: { temp: 72 },
      }),
      JSON.stringify({
        type: "finish",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5 },
      }),
      "[DONE]",
    ];

    const stream = createUIMessageStream(events);
    const decodedStream = stream.pipeThrough(new UIMessageStreamDecoder());
    const chunks = await collectChunks(decodedStream);

    // Find tool-call part-start
    const toolCallStart = chunks.find(
      (c): c is AssistantStreamChunk & { type: "part-start" } =>
        c.type === "part-start" && c.part.type === "tool-call",
    );
    expect(toolCallStart).toBeDefined();
    if (toolCallStart?.part.type === "tool-call") {
      expect(toolCallStart.part.toolName).toBe("weather");
      expect(toolCallStart.part.toolCallId).toBe("call_abc");
    }

    // Find result
    const result = chunks.find(
      (c): c is AssistantStreamChunk & { type: "result" } =>
        c.type === "result",
    );
    expect(result).toBeDefined();
    expect(result?.result).toEqual({ temp: 72 });
  });

  it("should decode source-url parts", async () => {
    const events = [
      JSON.stringify({ type: "start", messageId: "msg_123" }),
      JSON.stringify({
        type: "source-url",
        sourceId: "src_1",
        url: "https://example.com",
        title: "Example",
      }),
      JSON.stringify({
        type: "source-url",
        sourceId: "src_2",
        url: "https://example.org",
      }),
      JSON.stringify({
        type: "finish",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5 },
      }),
      "[DONE]",
    ];

    const stream = createUIMessageStream(events);
    const decodedStream = stream.pipeThrough(new UIMessageStreamDecoder());
    const chunks = await collectChunks(decodedStream);

    const sourceStarts = chunks.filter(
      (c): c is AssistantStreamChunk & { type: "part-start" } =>
        c.type === "part-start" && c.part.type === "source",
    );
    expect(sourceStarts).toHaveLength(2);
    if (sourceStarts[0]?.part.type === "source") {
      expect(sourceStarts[0].part.id).toBe("src_1");
      expect(sourceStarts[0].part.url).toBe("https://example.com");
      expect(sourceStarts[0].part.title).toBe("Example");
    }
    if (sourceStarts[1]?.part.type === "source") {
      expect(sourceStarts[1].part.id).toBe("src_2");
      expect(sourceStarts[1].part.url).toBe("https://example.org");
      expect(sourceStarts[1].part.title).toBeUndefined();
    }
  });

  it("should decode legacy source parts", async () => {
    const events = [
      JSON.stringify({ type: "start", messageId: "msg_123" }),
      JSON.stringify({
        type: "source",
        source: {
          sourceType: "url",
          id: "src_1",
          url: "https://example.com",
          title: "Example",
        },
      }),
      JSON.stringify({
        type: "finish",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5 },
      }),
      "[DONE]",
    ];

    const stream = createUIMessageStream(events);
    const decodedStream = stream.pipeThrough(new UIMessageStreamDecoder());
    const chunks = await collectChunks(decodedStream);

    const sourceStart = chunks.find(
      (c): c is AssistantStreamChunk & { type: "part-start" } =>
        c.type === "part-start" && c.part.type === "source",
    );
    expect(sourceStart).toBeDefined();
    if (sourceStart?.part.type === "source") {
      expect(sourceStart.part.id).toBe("src_1");
      expect(sourceStart.part.url).toBe("https://example.com");
      expect(sourceStart.part.title).toBe("Example");
    }
  });

  it("should decode file parts", async () => {
    const events = [
      JSON.stringify({ type: "start", messageId: "msg_123" }),
      JSON.stringify({
        type: "file",
        url: "https://example.com/image.png",
        mediaType: "image/png",
      }),
      JSON.stringify({
        type: "finish",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5 },
      }),
      "[DONE]",
    ];

    const stream = createUIMessageStream(events);
    const decodedStream = stream.pipeThrough(new UIMessageStreamDecoder());
    const chunks = await collectChunks(decodedStream);

    const fileStart = chunks.find(
      (c): c is AssistantStreamChunk & { type: "part-start" } =>
        c.type === "part-start" && c.part.type === "file",
    );
    expect(fileStart).toBeDefined();
    if (fileStart?.part.type === "file") {
      expect(fileStart.part.mimeType).toBe("image/png");
      expect(fileStart.part.data).toBe("https://example.com/image.png");
    }
  });

  it("should decode legacy file parts", async () => {
    const events = [
      JSON.stringify({ type: "start", messageId: "msg_123" }),
      JSON.stringify({
        type: "file",
        file: {
          mimeType: "image/png",
          data: "base64data...",
        },
      }),
      JSON.stringify({
        type: "finish",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5 },
      }),
      "[DONE]",
    ];

    const stream = createUIMessageStream(events);
    const decodedStream = stream.pipeThrough(new UIMessageStreamDecoder());
    const chunks = await collectChunks(decodedStream);

    const fileStart = chunks.find(
      (c): c is AssistantStreamChunk & { type: "part-start" } =>
        c.type === "part-start" && c.part.type === "file",
    );
    expect(fileStart).toBeDefined();
    if (fileStart?.part.type === "file") {
      expect(fileStart.part.mimeType).toBe("image/png");
      expect(fileStart.part.data).toBe("base64data...");
    }
  });

  it("should handle data-* chunks", async () => {
    const onData = vi.fn();
    const events = [
      JSON.stringify({ type: "start", messageId: "msg_123" }),
      JSON.stringify({
        type: "data-weather",
        data: { temp: 72, city: "NYC" },
      }),
      JSON.stringify({
        type: "finish",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5 },
      }),
      "[DONE]",
    ];

    const stream = createUIMessageStream(events);
    const decodedStream = stream.pipeThrough(
      new UIMessageStreamDecoder({ onData }),
    );
    await collectChunks(decodedStream);

    expect(onData).toHaveBeenCalledWith({
      type: "data-weather",
      name: "weather",
      data: { temp: 72, city: "NYC" },
      transient: undefined,
    });
  });

  it("should handle transient data-* chunks", async () => {
    const onData = vi.fn();
    const events = [
      JSON.stringify({ type: "start", messageId: "msg_123" }),
      JSON.stringify({
        type: "data-progress",
        transient: true,
        data: { percent: 50 },
      }),
      JSON.stringify({
        type: "finish",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5 },
      }),
      "[DONE]",
    ];

    const stream = createUIMessageStream(events);
    const decodedStream = stream.pipeThrough(
      new UIMessageStreamDecoder({ onData }),
    );
    const chunks = await collectChunks(decodedStream);

    // Transient data should call onData
    expect(onData).toHaveBeenCalledWith({
      type: "data-progress",
      name: "progress",
      data: { percent: 50 },
      transient: true,
    });

    // Transient data should NOT emit a data chunk
    const dataChunks = chunks.filter((c) => c.type === "data");
    expect(dataChunks).toHaveLength(0);
  });

  it("should handle step lifecycle", async () => {
    const events = [
      JSON.stringify({ type: "start", messageId: "msg_123" }),
      JSON.stringify({ type: "start-step", messageId: "step_1" }),
      JSON.stringify({ type: "text-start", id: "text_1" }),
      JSON.stringify({ type: "text-delta", id: "text_1", delta: "Hello" }),
      JSON.stringify({ type: "text-end" }),
      JSON.stringify({
        type: "finish-step",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5 },
        isContinued: false,
      }),
      JSON.stringify({
        type: "finish",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5 },
      }),
      "[DONE]",
    ];

    const stream = createUIMessageStream(events);
    const decodedStream = stream.pipeThrough(new UIMessageStreamDecoder());
    const chunks = await collectChunks(decodedStream);

    // Find step-start chunks
    const stepStarts = chunks.filter((c) => c.type === "step-start");
    expect(stepStarts.length).toBeGreaterThanOrEqual(1);

    // Find step-finish
    const stepFinish = chunks.find(
      (c): c is AssistantStreamChunk & { type: "step-finish" } =>
        c.type === "step-finish",
    );
    expect(stepFinish).toBeDefined();
    expect(stepFinish?.finishReason).toBe("stop");
    expect(stepFinish?.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
    expect(stepFinish?.isContinued).toBe(false);
  });

  it("should handle the stock v6 lifecycle with bare step chunks", async () => {
    const events = [
      JSON.stringify({ type: "start" }),
      JSON.stringify({ type: "start-step" }),
      JSON.stringify({ type: "text-start", id: "text_1" }),
      JSON.stringify({ type: "text-delta", id: "text_1", delta: "Hello" }),
      JSON.stringify({ type: "text-end" }),
      JSON.stringify({ type: "finish-step" }),
      JSON.stringify({ type: "finish", finishReason: "stop" }),
      "[DONE]",
    ];

    const stream = createUIMessageStream(events);
    const decodedStream = stream.pipeThrough(new UIMessageStreamDecoder());
    const chunks = await collectChunks(decodedStream);

    const stepStarts = chunks.filter(
      (c): c is AssistantStreamChunk & { type: "step-start" } =>
        c.type === "step-start",
    );
    expect(stepStarts).toHaveLength(2);
    expect(stepStarts[0]?.messageId).toBeTruthy();
    expect(stepStarts[1]?.messageId).toBe(stepStarts[0]?.messageId);

    const stepFinish = chunks.find(
      (c): c is AssistantStreamChunk & { type: "step-finish" } =>
        c.type === "step-finish",
    );
    expect(stepFinish?.finishReason).toBe("unknown");
    expect(stepFinish?.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
    expect(stepFinish?.isContinued).toBe(false);

    const messageFinish = chunks.find(
      (c): c is AssistantStreamChunk & { type: "message-finish" } =>
        c.type === "message-finish",
    );
    expect(messageFinish?.finishReason).toBe("stop");
  });

  it("should default finishReason on a bare finish chunk", async () => {
    const events = [
      JSON.stringify({ type: "start", messageId: "msg_123" }),
      JSON.stringify({ type: "text-start", id: "text_1" }),
      JSON.stringify({ type: "text-delta", id: "text_1", delta: "Hello" }),
      JSON.stringify({ type: "text-end" }),
      JSON.stringify({ type: "finish" }),
      "[DONE]",
    ];

    const stream = createUIMessageStream(events);
    const decodedStream = stream.pipeThrough(new UIMessageStreamDecoder());
    const chunks = await collectChunks(decodedStream);

    const messageFinish = chunks.find(
      (c): c is AssistantStreamChunk & { type: "message-finish" } =>
        c.type === "message-finish",
    );
    expect(messageFinish?.finishReason).toBe("unknown");
    expect(messageFinish?.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
  });

  it("should ignore malformed legacy source and file chunks", async () => {
    const events = [
      JSON.stringify({ type: "start", messageId: "msg_123" }),
      JSON.stringify({ type: "source" }),
      JSON.stringify({ type: "source", source: null }),
      JSON.stringify({ type: "file" }),
      JSON.stringify({ type: "file", file: null }),
      JSON.stringify({
        type: "finish",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5 },
      }),
      "[DONE]",
    ];

    const stream = createUIMessageStream(events);
    const decodedStream = stream.pipeThrough(new UIMessageStreamDecoder());
    const chunks = await collectChunks(decodedStream);

    const partStarts = chunks.filter(
      (c) =>
        c.type === "part-start" &&
        (c.part.type === "source" || c.part.type === "file"),
    );
    expect(partStarts).toHaveLength(0);
  });

  it("should handle errors", async () => {
    const events = [
      JSON.stringify({ type: "start", messageId: "msg_123" }),
      JSON.stringify({ type: "error", errorText: "Something went wrong" }),
      "[DONE]",
    ];

    const stream = createUIMessageStream(events);
    const decodedStream = stream.pipeThrough(new UIMessageStreamDecoder());
    const chunks = await collectChunks(decodedStream);

    const errorChunk = chunks.find(
      (c): c is AssistantStreamChunk & { type: "error" } => c.type === "error",
    );
    expect(errorChunk).toBeDefined();
    expect(errorChunk?.error).toBe("Something went wrong");
  });

  it("should throw when stream ends without [DONE]", async () => {
    const encoder = new TextEncoder();
    const sseText =
      'data: {"type":"text-delta","id":"text_1","delta":"Hello"}\n\n' +
      'data: {"type":"text-delta","id":"text_1","delta":" world"}\n\n';

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(sseText));
        controller.close();
      },
    });

    const decodedStream = stream.pipeThrough(new UIMessageStreamDecoder());

    await expect(collectChunks(decodedStream)).rejects.toThrow(
      "Stream ended abruptly without receiving [DONE] marker",
    );
  });

  it("should discard an unterminated [DONE] event", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n"));
        controller.close();
      },
    });

    const decodedStream = stream.pipeThrough(new UIMessageStreamDecoder());

    await expect(collectChunks(decodedStream)).rejects.toThrow(
      "Stream ended abruptly without receiving [DONE] marker",
    );
  });

  it("should ignore unknown chunk types for forward compatibility", async () => {
    const events = [
      JSON.stringify({ type: "start", messageId: "msg_123" }),
      JSON.stringify({ type: "unknown-future-type", data: {} }),
      JSON.stringify({
        type: "finish",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5 },
      }),
      "[DONE]",
    ];

    const stream = createUIMessageStream(events);
    const decodedStream = stream.pipeThrough(new UIMessageStreamDecoder());
    const chunks = await collectChunks(decodedStream);

    // Should not throw, should complete successfully
    expect(chunks.some((c) => c.type === "message-finish")).toBe(true);
  });

  it("drops frames that are not objects with a string type", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const invalidFrames = [
      "null",
      "5",
      '"text"',
      "[1,2]",
      '{"foo":1}',
      '{"type":5}',
    ];
    const events = [
      ...invalidFrames,
      JSON.stringify({ type: "start", messageId: "msg_123" }),
      JSON.stringify({ type: "text-delta", id: "t", delta: "ok" }),
      "[DONE]",
    ];

    const chunks = await collectChunks(
      createUIMessageStream(events).pipeThrough(new UIMessageStreamDecoder()),
    );

    expect(warn.mock.calls.map((c) => c[0])).toEqual(
      invalidFrames.map((f) => `Dropped invalid UIMessageStream chunk: ${f}`),
    );
    expect(chunks.some((c) => c.type === "text-delta")).toBe(true);
    warn.mockRestore();
  });

  it("drops frames carrying prototype-pollution keys", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const events = [
      '{"type":"text-delta","delta":"x","__proto__":{"polluted":true}}',
      '{"type":"text-delta","delta":"y","constructor":{"prototype":{"polluted":true}}}',
      JSON.stringify({ type: "start", messageId: "msg_123" }),
      JSON.stringify({ type: "text-delta", id: "t", delta: "ok" }),
      "[DONE]",
    ];

    const chunks = await collectChunks(
      createUIMessageStream(events).pipeThrough(new UIMessageStreamDecoder()),
    );

    expect(warn).toHaveBeenCalledTimes(2);
    const deltas = chunks.filter(
      (c): c is AssistantStreamChunk & { type: "text-delta" } =>
        c.type === "text-delta",
    );
    expect(deltas).toHaveLength(1);
    expect(deltas[0]!.textDelta).toBe("ok");
    warn.mockRestore();
  });

  it("drops frames that are not valid JSON", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const invalidFrames = ['{"type":"te', "not json"];
    const events = [
      ...invalidFrames,
      JSON.stringify({ type: "start", messageId: "msg_123" }),
      JSON.stringify({ type: "text-delta", id: "t", delta: "ok" }),
      "[DONE]",
    ];

    const chunks = await collectChunks(
      createUIMessageStream(events).pipeThrough(new UIMessageStreamDecoder()),
    );

    expect(warn.mock.calls.map((c) => c[0])).toEqual(
      invalidFrames.map((f) => `Dropped invalid UIMessageStream chunk: ${f}`),
    );
    expect(chunks.some((c) => c.type === "text-delta")).toBe(true);
    warn.mockRestore();
  });

  it("ignores a tool-call-delta arriving after tool-result", async () => {
    const events = [
      JSON.stringify({ type: "start", messageId: "msg_123" }),
      JSON.stringify({
        type: "tool-call-start",
        toolCallId: "call_abc",
        toolName: "weather",
      }),
      JSON.stringify({ type: "tool-call-delta", argsText: '{"city":"NYC"}' }),
      JSON.stringify({
        type: "tool-result",
        toolCallId: "call_abc",
        result: { temp: 72 },
      }),
      JSON.stringify({ type: "tool-call-delta", argsText: '{"late":true}' }),
      "[DONE]",
    ];

    const chunks = await collectChunks(
      createUIMessageStream(events).pipeThrough(new UIMessageStreamDecoder()),
    );

    const argDeltas = chunks.filter((c) => c.type === "text-delta");
    expect(argDeltas).toHaveLength(1);
    expect(chunks.some((c) => c.type === "result")).toBe(true);
  });

  it("settles the tool part at result time instead of decoder flush", async () => {
    const events = [
      JSON.stringify({ type: "start", messageId: "msg_123" }),
      JSON.stringify({
        type: "tool-call-start",
        toolCallId: "call_abc",
        toolName: "weather",
      }),
      JSON.stringify({ type: "tool-call-delta", argsText: '{"city":"NYC"}' }),
      JSON.stringify({ type: "tool-call-end" }),
      JSON.stringify({
        type: "tool-result",
        toolCallId: "call_abc",
        result: { temp: 72 },
      }),
      JSON.stringify({ type: "text-start", id: "text_1" }),
      JSON.stringify({ type: "text-delta", id: "text_1", delta: "Hello" }),
      JSON.stringify({ type: "text-end" }),
      JSON.stringify({
        type: "finish",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5 },
      }),
      "[DONE]",
    ];

    const chunks = await collectChunks(
      createUIMessageStream(events).pipeThrough(new UIMessageStreamDecoder()),
    );

    const toolPartFinish = chunks.findIndex(
      (c) => c.type === "part-finish" && c.path[0] === 0,
    );
    const result = chunks.findIndex((c) => c.type === "result");
    const messageFinish = chunks.findIndex((c) => c.type === "message-finish");
    expect(result).toBeGreaterThan(-1);
    expect(messageFinish).toBeGreaterThan(-1);
    expect(toolPartFinish).toBeGreaterThan(result);
    expect(toolPartFinish).toBeLessThan(messageFinish);
  });

  it("keeps the active tool call writable when another call receives its result", async () => {
    const events = [
      JSON.stringify({
        type: "tool-call-start",
        toolCallId: "call_a",
        toolName: "first",
      }),
      JSON.stringify({
        type: "tool-call-start",
        toolCallId: "call_b",
        toolName: "second",
      }),
      JSON.stringify({
        type: "tool-result",
        toolCallId: "call_a",
        result: { ok: true },
      }),
      JSON.stringify({ type: "tool-call-delta", argsText: '{"x":1}' }),
      "[DONE]",
    ];

    const chunks = await collectChunks(
      createUIMessageStream(events).pipeThrough(new UIMessageStreamDecoder()),
    );

    const argDeltas = chunks.filter(
      (c): c is AssistantStreamChunk & { type: "text-delta" } =>
        c.type === "text-delta",
    );
    expect(argDeltas).toHaveLength(2);
    const byPath = new Map(argDeltas.map((c) => [c.path[0], c.textDelta]));
    expect(byPath.get(0)).toBe("{}");
    expect(byPath.get(1)).toBe('{"x":1}');
  });

  it("materializes a tool result frame that carries no result", async () => {
    const events = [
      JSON.stringify({ type: "start", messageId: "msg_123" }),
      JSON.stringify({
        type: "tool-call-start",
        id: "tc_1",
        toolCallId: "call_abc",
        toolName: "notify",
      }),
      JSON.stringify({ type: "tool-call-delta", argsText: "{}" }),
      JSON.stringify({ type: "tool-call-end" }),
      JSON.stringify({ type: "tool-result", toolCallId: "call_abc" }),
      JSON.stringify({
        type: "finish",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5 },
      }),
      "[DONE]",
    ];

    const stream = createUIMessageStream(events);
    const decodedStream = stream.pipeThrough(new UIMessageStreamDecoder());
    const chunks = await collectChunks(decodedStream);

    const result = chunks.find(
      (c): c is AssistantStreamChunk & { type: "result" } =>
        c.type === "result",
    );
    expect(result?.result).toBe(NO_RESULT);
  });
});

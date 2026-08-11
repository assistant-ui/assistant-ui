import { describe, it, expect, vi } from "vitest";
import { AssistantMessageAccumulator } from "./assistant-message-accumulator";
import type { AssistantStreamChunk } from "../AssistantStreamChunk";
import type { AssistantMessage } from "../utils/types";

const collectStream = async (
  chunks: AssistantStreamChunk[],
): Promise<AssistantMessage[]> => {
  const accumulator = new AssistantMessageAccumulator();
  const messages: AssistantMessage[] = [];

  const source = new ReadableStream<AssistantStreamChunk>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

  await source.pipeThrough(accumulator).pipeTo(
    new WritableStream({
      write(message) {
        messages.push(message);
      },
    }),
  );

  return messages;
};

describe("AssistantMessageAccumulator reasoning summaries", () => {
  it("copies reasoning summaries from part-start chunks", async () => {
    const messages = await collectStream([
      {
        type: "part-start",
        path: [0],
        part: { type: "reasoning", unstable_summary: "Planning" },
      },
      { type: "text-delta", path: [0], textDelta: "thinking" },
      { type: "part-finish", path: [0] },
    ]);

    expect(messages.at(-1)?.parts).toEqual([
      expect.objectContaining({
        type: "reasoning",
        text: "thinking",
        unstable_summary: "Planning",
      }),
    ]);
  });

  it("preserves an empty reasoning summary", async () => {
    const messages = await collectStream([
      {
        type: "part-start",
        path: [0],
        part: { type: "reasoning", unstable_summary: "" },
      },
    ]);

    expect(messages.at(-1)?.parts[0]).toEqual(
      expect.objectContaining({ type: "reasoning", unstable_summary: "" }),
    );
  });
});

describe("AssistantMessageAccumulator timing", () => {
  it("should include timing on message-finish", async () => {
    const chunks: AssistantStreamChunk[] = [
      { type: "step-start", path: [], messageId: "msg-1" },
      { type: "part-start", path: [0], part: { type: "text" } },
      { type: "text-delta", path: [0], textDelta: "Hello " },
      { type: "text-delta", path: [0], textDelta: "world" },
      { type: "part-finish", path: [0] },
      {
        type: "step-finish",
        path: [],
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5 },
        isContinued: false,
      },
      {
        type: "message-finish",
        path: [],
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 5 },
      },
    ];

    const messages = await collectStream(chunks);
    const last = messages.at(-1)!;

    expect(last.metadata.timing).toBeDefined();
    const timing = last.metadata.timing!;
    expect(timing.streamStartTime).toBeTypeOf("number");
    expect(timing.totalChunks).toBe(7);
    expect(timing.toolCallCount).toBe(0);
    expect(timing.tokenCount).toBe(5);
    expect(timing.firstTokenTime).toBeTypeOf("number");
    expect(timing.totalStreamTime).toBeTypeOf("number");
    expect(timing.totalStreamTime).toBeGreaterThanOrEqual(0);
  });

  it("should track tool calls in timing", async () => {
    const chunks: AssistantStreamChunk[] = [
      {
        type: "part-start",
        path: [0],
        part: {
          type: "tool-call",
          toolCallId: "tc-1",
          toolName: "search",
        },
      },
      { type: "text-delta", path: [0], textDelta: '{"q":"test"}' },
      { type: "tool-call-args-text-finish", path: [0] },
      {
        type: "result",
        path: [0],
        result: "found",
        isError: false,
      },
      { type: "part-finish", path: [0] },
      {
        type: "message-finish",
        path: [],
        finishReason: "stop",
        usage: { inputTokens: 0, outputTokens: 0 },
      },
    ];

    const messages = await collectStream(chunks);
    const last = messages.at(-1)!;

    expect(last.metadata.timing).toBeDefined();
    expect(last.metadata.timing!.toolCallCount).toBe(1);
  });

  it("should record per-tool-call timing on the part", async () => {
    const before = Date.now();
    const chunks: AssistantStreamChunk[] = [
      {
        type: "part-start",
        path: [0],
        part: {
          type: "tool-call",
          toolCallId: "tc-1",
          toolName: "search",
        },
      },
      { type: "text-delta", path: [0], textDelta: '{"q":"test"}' },
      { type: "tool-call-args-text-finish", path: [0] },
      {
        type: "result",
        path: [0],
        result: "found",
        isError: false,
      },
      { type: "part-finish", path: [0] },
      {
        type: "message-finish",
        path: [],
        finishReason: "stop",
        usage: { inputTokens: 0, outputTokens: 0 },
      },
    ];

    const messages = await collectStream(chunks);
    const after = Date.now();

    const runningPart = messages
      .find((m) =>
        m.parts.some((p) => p.type === "tool-call" && p.state !== "result"),
      )!
      .parts.find((p) => p.type === "tool-call")!;
    expect(runningPart.timing).toBeDefined();
    expect(runningPart.timing!.startedAt).toBeGreaterThanOrEqual(before);
    expect(runningPart.timing!.completedAt).toBeUndefined();

    const settledPart = messages
      .at(-1)!
      .parts.find((p) => p.type === "tool-call")!;
    expect(settledPart.timing).toBeDefined();
    expect(settledPart.timing!.completedAt).toBeGreaterThanOrEqual(
      settledPart.timing!.startedAt,
    );
    expect(settledPart.timing!.completedAt).toBeLessThanOrEqual(after);
  });

  it("should include timing on flush when stream closes without message-finish", async () => {
    const chunks: AssistantStreamChunk[] = [
      { type: "part-start", path: [0], part: { type: "text" } },
      { type: "text-delta", path: [0], textDelta: "partial" },
    ];

    const messages = await collectStream(chunks);
    const last = messages.at(-1)!;

    // flush should have produced a message with timing
    expect(last.metadata.timing).toBeDefined();
    expect(last.metadata.timing!.totalChunks).toBe(2);
  });

  it("should estimate tokens from text when no usage provided", async () => {
    const chunks: AssistantStreamChunk[] = [
      { type: "part-start", path: [0], part: { type: "text" } },
      {
        type: "text-delta",
        path: [0],
        textDelta: "1234567890123456789012345678901234567890",
      }, // 40 chars
      { type: "part-finish", path: [0] },
      {
        type: "message-finish",
        path: [],
        finishReason: "stop",
        usage: { inputTokens: 0, outputTokens: 0 },
      },
    ];

    const messages = await collectStream(chunks);
    const last = messages.at(-1)!;

    expect(last.metadata.timing!.tokenCount).toBe(10); // 40/4
  });

  it("should record firstTokenTime on text-delta", async () => {
    const chunks: AssistantStreamChunk[] = [
      {
        type: "part-start",
        path: [0],
        part: {
          type: "tool-call",
          toolCallId: "tc-1",
          toolName: "search",
        },
      },
      { type: "text-delta", path: [0], textDelta: "{}" },
      { type: "tool-call-args-text-finish", path: [0] },
      {
        type: "result",
        path: [0],
        result: "ok",
        isError: false,
      },
      { type: "part-finish", path: [0] },
      {
        type: "message-finish",
        path: [],
        finishReason: "stop",
        usage: { inputTokens: 0, outputTokens: 0 },
      },
    ];

    const messages = await collectStream(chunks);
    const last = messages.at(-1)!;

    // text-delta on tool-call args still records first token
    expect(last.metadata.timing).toBeDefined();
    expect(last.metadata.timing!.firstTokenTime).toBeTypeOf("number");
  });

  it("does not record firstTokenTime when a text-delta is dropped for an out-of-range path", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const messages = await collectStream([
      { type: "part-start", path: [0], part: { type: "text" } },
      { type: "text-delta", path: [5], textDelta: "x" },
    ]);
    const last = messages.at(-1)!;

    expect(last.metadata.timing).toBeDefined();
    expect(last.metadata.timing!.firstTokenTime).toBeUndefined();
    warn.mockRestore();
  });

  it("does not record firstTokenTime when a text-delta is dropped for a nested path", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const messages = await collectStream([
      { type: "part-start", path: [0], part: { type: "text" } },
      { type: "text-delta", path: [0, 1], textDelta: "x" },
    ]);
    const last = messages.at(-1)!;

    expect(last.metadata.timing).toBeDefined();
    expect(last.metadata.timing!.firstTokenTime).toBeUndefined();
    warn.mockRestore();
  });

  it("does not record firstTokenTime when a text-delta is dropped for a wrong part type", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const messages = await collectStream([
      {
        type: "part-start",
        path: [0],
        part: {
          type: "source",
          sourceType: "url",
          id: "s1",
          url: "https://example.com",
        },
      },
      { type: "text-delta", path: [0], textDelta: "x" },
    ]);
    const last = messages.at(-1)!;

    expect(last.metadata.timing).toBeDefined();
    expect(last.metadata.timing!.firstTokenTime).toBeUndefined();
    warn.mockRestore();
  });

  it("records firstTokenTime on the first applied text-delta, not a preceding dropped one", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);

    const accumulator = new AssistantMessageAccumulator();
    const writer = accumulator.writable.getWriter();
    const messages: AssistantMessage[] = [];
    const reading = (async () => {
      const reader = accumulator.readable.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        messages.push(value);
      }
    })();

    await writer.write({
      type: "part-start",
      path: [0],
      part: { type: "text" },
    });
    vi.setSystemTime(2000);
    await writer.write({ type: "text-delta", path: [5], textDelta: "x" });
    vi.setSystemTime(3000);
    await writer.write({ type: "text-delta", path: [0], textDelta: "hi" });
    await writer.close();
    await reading;
    vi.useRealTimers();

    const last = messages.at(-1)!;
    expect(last.metadata.timing).toBeDefined();
    expect(last.metadata.timing!.firstTokenTime).toBe(2000);
  });
});

describe("AssistantMessageAccumulator error chunks", () => {
  it("defaults missing code to unknown", async () => {
    const messages = await collectStream([
      { type: "error", path: [], error: "stream failed" },
    ]);
    const last = messages.at(-1)!;

    expect(last.status).toEqual({
      type: "incomplete",
      reason: "error",
      error: { code: "unknown", message: "stream failed" },
    });
  });

  it("defaults a missing error message", async () => {
    const messages = await collectStream([
      { type: "error", path: [] } as unknown as AssistantStreamChunk,
    ]);
    const last = messages.at(-1)!;

    expect(last.status).toEqual({
      type: "incomplete",
      reason: "error",
      error: { code: "unknown", message: "unknown error" },
    });
  });

  it("carries code and severity through unchanged", async () => {
    const messages = await collectStream([
      {
        type: "error",
        path: [],
        error: "rate limited",
        code: "provider",
        severity: "warning",
      },
    ]);
    const last = messages.at(-1)!;

    expect(last.status).toEqual({
      type: "incomplete",
      reason: "error",
      error: {
        code: "provider",
        message: "rate limited",
        severity: "warning",
      },
    });
  });

  it("drops out-of-taxonomy severity at ingestion", async () => {
    const messages = await collectStream([
      {
        type: "error",
        path: [],
        error: "boom",
        code: "unknown",
        severity: "fatal",
      } as unknown as AssistantStreamChunk,
    ]);
    const last = messages.at(-1)!;

    expect(last.status).toEqual({
      type: "incomplete",
      reason: "error",
      error: {
        code: "unknown",
        message: "boom",
      },
    });
    expect(last.status).toMatchObject({
      error: expect.not.objectContaining({ severity: expect.anything() }),
    });
  });
});

describe("AssistantMessageAccumulator part path bounds", () => {
  it("drops a text-delta whose path is out of range with a warning", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const messages = await collectStream([
      { type: "part-start", path: [0], part: { type: "text" } },
      { type: "text-delta", path: [5], textDelta: "x" },
      { type: "text-delta", path: [0], textDelta: "hi" },
    ]);
    const last = messages.at(-1)!;

    expect(last.parts).toHaveLength(1);
    expect(last.parts[0]).toMatchObject({ type: "text", text: "hi" });
    expect(warn).toHaveBeenCalledWith(
      "Dropped text-delta chunk: no part at path [5]",
    );
    warn.mockRestore();
  });

  it("drops an out-of-range part-finish instead of fabricating a part", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const messages = await collectStream([
      { type: "part-start", path: [0], part: { type: "text" } },
      { type: "part-finish", path: [3] },
    ]);
    const last = messages.at(-1)!;

    expect(last.parts).toHaveLength(1);
    expect(last.parts[0]!.type).toBe("text");
    warn.mockRestore();
  });

  it("drops part chunks when no parts exist", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const messages = await collectStream([
      { type: "text-delta", path: [0], textDelta: "x" },
      { type: "part-start", path: [0], part: { type: "text" } },
      { type: "text-delta", path: [0], textDelta: "ok" },
    ]);
    const last = messages.at(-1)!;

    expect(last.parts).toHaveLength(1);
    expect(last.parts[0]).toMatchObject({ type: "text", text: "ok" });
    warn.mockRestore();
  });

  it("drops chunks with nested paths", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const messages = await collectStream([
      { type: "part-start", path: [0], part: { type: "text" } },
      { type: "text-delta", path: [0, 1], textDelta: "x" },
      { type: "text-delta", path: [0], textDelta: "ok" },
    ]);
    const last = messages.at(-1)!;

    expect(last.parts).toHaveLength(1);
    expect(last.parts[0]).toMatchObject({ type: "text", text: "ok" });
    warn.mockRestore();
  });

  it("drops an out-of-range result without touching existing tool calls", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const messages = await collectStream([
      {
        type: "part-start",
        path: [0],
        part: { type: "tool-call", toolCallId: "t1", toolName: "f" },
      },
      { type: "text-delta", path: [0], textDelta: "{}" },
      { type: "result", path: [7], result: { ok: true }, isError: false },
      { type: "result", path: [0], result: { ok: true }, isError: false },
    ]);
    const last = messages.at(-1)!;

    expect(last.parts).toHaveLength(1);
    expect(last.parts[0]).toMatchObject({
      type: "tool-call",
      state: "result",
      result: { ok: true },
    });
    warn.mockRestore();
  });
});

describe("AssistantMessageAccumulator wrong part type chunks", () => {
  const sourcePart = {
    type: "source",
    sourceType: "url",
    id: "s1",
    url: "https://example.com",
  } as const;

  it("drops a text-delta addressed to a source part", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const messages = await collectStream([
      { type: "part-start", path: [0], part: sourcePart },
      { type: "text-delta", path: [0], textDelta: "x" },
    ]);
    const last = messages.at(-1)!;

    expect(last.parts[0]).toMatchObject({ type: "source", id: "s1" });
    expect(warn).toHaveBeenCalledWith(
      "Dropped text-delta chunk: part is neither text nor tool-call",
    );
    warn.mockRestore();
  });

  it("drops a result addressed to a text part", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const messages = await collectStream([
      { type: "part-start", path: [0], part: { type: "text" } },
      { type: "text-delta", path: [0], textDelta: "hi" },
      { type: "result", path: [0], result: { ok: true }, isError: false },
    ]);
    const last = messages.at(-1)!;

    expect(last.parts[0]).toMatchObject({ type: "text", text: "hi" });
    expect(warn).toHaveBeenCalledWith(
      "Dropped result chunk: part is not a tool-call",
    );
    warn.mockRestore();
  });

  it("drops an args-text-finish addressed to a text part", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const messages = await collectStream([
      { type: "part-start", path: [0], part: { type: "text" } },
      { type: "tool-call-args-text-finish", path: [0] },
    ]);
    const last = messages.at(-1)!;

    expect(last.parts[0]).toMatchObject({ type: "text" });
    expect(warn).toHaveBeenCalledWith(
      "Dropped tool-call-args-text-finish chunk: part is not a tool-call",
    );
    warn.mockRestore();
  });

  it("inserts a placeholder for an unsupported part-start so later part indices stay aligned", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const messages = await collectStream([
      {
        type: "part-start",
        path: [0],
        part: { type: "bogus" },
      } as unknown as AssistantStreamChunk,
      { type: "part-start", path: [1], part: { type: "text" } },
      { type: "text-delta", path: [1], textDelta: "ok" },
      { type: "part-finish", path: [0] },
    ]);
    const last = messages.at(-1)!;

    expect(last.parts).toHaveLength(2);
    expect(last.parts[0]).toMatchObject({
      type: "reasoning",
      text: "",
      status: { type: "complete", reason: "unknown" },
    });
    expect(last.parts[1]).toMatchObject({ type: "text", text: "ok" });
    expect(warn).toHaveBeenCalledWith(
      "Unsupported part-start type bogus: inserting an empty reasoning part to preserve part indices",
    );
    warn.mockRestore();
  });
});

describe("AssistantMessageAccumulator warn dedup", () => {
  it("warns once per drop class per instance", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await collectStream([
      { type: "part-start", path: [0], part: { type: "text" } },
      { type: "text-delta", path: [5], textDelta: "a" },
      { type: "text-delta", path: [5], textDelta: "b" },
      { type: "text-delta", path: [6], textDelta: "c" },
      { type: "part-finish", path: [9] },
    ]);

    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith(
      "Dropped text-delta chunk: no part at path [5]",
    );
    expect(warn).toHaveBeenCalledWith(
      "Dropped part-finish chunk: no part at path [9]",
    );
    warn.mockRestore();
  });

  it("resets dedup per accumulator instance", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const stream = [
      { type: "part-start", path: [0], part: { type: "text" } },
      { type: "text-delta", path: [5], textDelta: "x" },
    ] satisfies AssistantStreamChunk[];
    await collectStream(stream);
    await collectStream(stream);

    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it("dedupes repeated wrong-part-type drops", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await collectStream([
      {
        type: "part-start",
        path: [0],
        part: { type: "source", sourceType: "url", id: "s", url: "https://x" },
      },
      { type: "text-delta", path: [0], textDelta: "a" },
      { type: "text-delta", path: [0], textDelta: "b" },
    ]);

    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe("AssistantMessageAccumulator warn dedup key independence", () => {
  it("keeps drop classes as independent keys within one stream", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await collectStream([
      {
        type: "part-start",
        path: [0],
        part: { type: "source", sourceType: "url", id: "s", url: "https://x" },
      },
      { type: "text-delta", path: [0], textDelta: "wrong-part" },
      { type: "text-delta", path: [7], textDelta: "no-part" },
    ]);

    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it("keys unsupported part-starts per type", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const messages = await collectStream([
      {
        type: "part-start",
        path: [0],
        part: { type: "bogus" },
      } as unknown as AssistantStreamChunk,
      {
        type: "part-start",
        path: [1],
        part: { type: "bogus" },
      } as unknown as AssistantStreamChunk,
      {
        type: "part-start",
        path: [2],
        part: { type: "video" },
      } as unknown as AssistantStreamChunk,
    ]);
    const last = messages.at(-1)!;

    expect(last.parts).toHaveLength(3);
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it("caps the number of warned keys per instance", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await collectStream(
      Array.from(
        { length: 20 },
        (_, i) =>
          ({
            type: "part-start",
            path: [i],
            part: { type: `bogus-${i}` },
          }) as unknown as AssistantStreamChunk,
      ),
    );

    expect(warn).toHaveBeenCalledTimes(16);
    warn.mockRestore();
  });
});

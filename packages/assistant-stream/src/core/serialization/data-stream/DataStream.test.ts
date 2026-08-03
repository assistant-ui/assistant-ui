import { afterEach, describe, expect, it, vi } from "vitest";
import { DataStreamDecoder } from "./DataStream";
import type { AssistantStreamChunk } from "../../AssistantStreamChunk";

const decodeLines = async (lines: string[], options?: { strict?: boolean }) => {
  const bytes = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const line of lines) controller.enqueue(encoder.encode(line + "\n"));
      controller.close();
    },
  });
  const chunks: AssistantStreamChunk[] = [];
  await bytes.pipeThrough(new DataStreamDecoder(options)).pipeTo(
    new WritableStream({
      write(chunk) {
        chunks.push(chunk);
      },
    }),
  );
  return chunks;
};

describe("DataStreamDecoder interleaved tool-call args", () => {
  it("drops args deltas for a closed args stream instead of crashing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const chunks = await decodeLines([
        'b:{"toolCallId":"t1","toolName":"search"}',
        '0:"progress text"',
        'c:{"toolCallId":"t1","argsTextDelta":"{\\"q\\":1}"}',
      ]);

      expect(
        chunks.some(
          (c) => c.type === "text-delta" && c.textDelta === "progress text",
        ),
      ).toBe(true);
      expect(
        chunks.some(
          (c) =>
            c.type === "part-start" &&
            c.part.type === "tool-call" &&
            c.part.toolCallId === "t1",
        ),
      ).toBe(true);
      expect(chunks.some((c) => c.type === "tool-call-args-text-finish")).toBe(
        true,
      );
      expect(
        chunks.some((c) => c.type === "text-delta" && c.textDelta === "{}"),
      ).toBe(true);
      expect(
        chunks.some(
          (c) => c.type === "text-delta" && c.textDelta === '{"q":1}',
        ),
      ).toBe(false);
      expect(warn).toHaveBeenCalledWith(
        "Dropped tool-call args delta for closed args stream: t1",
      );
    } finally {
      warn.mockRestore();
    }
  });

  it("drops args deltas arriving after the tool call's result", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const chunks = await decodeLines([
        'b:{"toolCallId":"t1","toolName":"search"}',
        'a:{"toolCallId":"t1","result":"ok"}',
        'c:{"toolCallId":"t1","argsTextDelta":"late"}',
      ]);

      expect(chunks.some((c) => c.type === "result" && c.result === "ok")).toBe(
        true,
      );
      expect(
        chunks.some((c) => c.type === "text-delta" && c.textDelta === "late"),
      ).toBe(false);
    } finally {
      warn.mockRestore();
    }
  });

  it("drops args deltas arriving after a complete tool call frame", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const chunks = await decodeLines([
        '9:{"toolCallId":"t1","toolName":"search","args":{"q":1}}',
        'c:{"toolCallId":"t1","argsTextDelta":"late"}',
      ]);

      expect(
        chunks.some(
          (c) =>
            c.type === "part-start" &&
            c.part.type === "tool-call" &&
            c.part.toolCallId === "t1",
        ),
      ).toBe(true);
      expect(
        chunks.some((c) => c.type === "text-delta" && c.textDelta === "late"),
      ).toBe(false);
    } finally {
      warn.mockRestore();
    }
  });
});

describe("DataStreamDecoder strict: false", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws on unknown tool call ids by default", async () => {
    await expect(
      decodeLines(['c:{"toolCallId":"missing","argsTextDelta":"{}"}']),
    ).rejects.toThrow("unknown id: missing");
  });

  it("drops chunks referencing unknown tool call ids", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const chunks = await decodeLines(
      [
        'c:{"toolCallId":"missing","argsTextDelta":"{}"}',
        'a:{"toolCallId":"missing","result":{}}',
        '0:"hello"',
      ],
      { strict: false },
    );

    expect(
      chunks.some((c) => c.type === "text-delta" && c.textDelta === "hello"),
    ).toBe(true);
    expect(
      chunks.some(
        (c) => c.type === "part-start" && c.part.type === "tool-call",
      ),
    ).toBe(false);
    expect(chunks.some((c) => c.type === "result")).toBe(false);
    expect(error).toHaveBeenCalledTimes(2);
  });

  it("drops duplicate tool call starts", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const chunks = await decodeLines(
      [
        'b:{"toolCallId":"t1","toolName":"search"}',
        'b:{"toolCallId":"t1","toolName":"search"}',
      ],
      { strict: false },
    );

    expect(
      chunks.filter(
        (c) => c.type === "part-start" && c.part.type === "tool-call",
      ),
    ).toHaveLength(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("keeps streaming args to the active tool call across a dropped duplicate start", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const chunks = await decodeLines(
      [
        'b:{"toolCallId":"t1","toolName":"search"}',
        'c:{"toolCallId":"t1","argsTextDelta":"{\\"a\\""}',
        'b:{"toolCallId":"t1","toolName":"search"}',
        'c:{"toolCallId":"t1","argsTextDelta":":1}"}',
      ],
      { strict: false },
    );

    const argsText = chunks
      .filter((c) => c.type === "text-delta")
      .map((c) => c.textDelta)
      .join("");
    expect(argsText).toBe('{"a":1}');
  });

  it("drops unsupported chunk types", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const chunks = await decodeLines(['zz:{"bogus":true}', '0:"hello"'], {
      strict: false,
    });

    expect(
      chunks.some((c) => c.type === "text-delta" && c.textDelta === "hello"),
    ).toBe(true);
    expect(error).toHaveBeenCalledTimes(1);
  });
});

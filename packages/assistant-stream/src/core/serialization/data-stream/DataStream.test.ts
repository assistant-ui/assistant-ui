import { describe, expect, it, vi } from "vitest";
import { DataStreamDecoder } from "./DataStream";
import type { AssistantStreamChunk } from "../../AssistantStreamChunk";

const decodeLines = async (lines: string[]) => {
  const bytes = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const line of lines) controller.enqueue(encoder.encode(line + "\n"));
      controller.close();
    },
  });
  const chunks: AssistantStreamChunk[] = [];
  await bytes.pipeThrough(new DataStreamDecoder()).pipeTo(
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

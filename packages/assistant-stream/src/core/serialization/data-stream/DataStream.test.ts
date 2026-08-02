import { describe, expect, it, vi } from "vitest";
import { DataStreamDecoder, DataStreamEncoder } from "./DataStream";
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

const encodeChunks = async (chunks: AssistantStreamChunk[]) => {
  const input = new ReadableStream<AssistantStreamChunk>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  const output: string[] = [];
  await input
    .pipeThrough(new DataStreamEncoder())
    .pipeThrough(new TextDecoderStream())
    .pipeTo(
      new WritableStream({
        write(chunk) {
          output.push(chunk);
        },
      }),
    );
  return output.join("").trimEnd().split("\n");
};

describe("DataStreamEncoder streamed tool-call args", () => {
  it("marks the final args frame when args finish", async () => {
    const lines = await encodeChunks([
      {
        type: "part-start",
        path: [],
        part: {
          type: "tool-call",
          toolCallId: "t1",
          toolName: "search",
        },
      },
      { type: "text-delta", path: [0], textDelta: '{"q":1}' },
      { type: "result", path: [0], result: "done", isError: false },
      { type: "tool-call-args-text-finish", path: [0] },
      { type: "part-finish", path: [0] },
    ]);

    expect(lines).toEqual([
      'b:{"toolCallId":"t1","toolName":"search"}',
      'c:{"toolCallId":"t1","argsTextDelta":"{\\"q\\":1}"}',
      'c:{"toolCallId":"t1","argsTextDelta":"","isFinal":true}',
      'a:{"toolCallId":"t1","result":"done"}',
    ]);
  });
});

describe("DataStreamDecoder interleaved tool-call args", () => {
  it("preserves args interleaved with text until the final args frame", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const chunks = await decodeLines([
        'b:{"toolCallId":"t1","toolName":"search"}',
        '0:"progress text"',
        'c:{"toolCallId":"t1","argsTextDelta":"{\\"q\\":1}"}',
        'c:{"toolCallId":"t1","argsTextDelta":"","isFinal":true}',
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
      ).toBe(false);
      expect(
        chunks.some(
          (c) => c.type === "text-delta" && c.textDelta === '{"q":1}',
        ),
      ).toBe(true);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("preserves interleaved args from legacy streams until flush", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const chunks = await decodeLines([
        'b:{"toolCallId":"t1","toolName":"search"}',
        '0:"progress text"',
        'c:{"toolCallId":"t1","argsTextDelta":"{\\"q\\":1}"}',
      ]);

      expect(
        chunks.some(
          (c) => c.type === "text-delta" && c.textDelta === '{"q":1}',
        ),
      ).toBe(true);
      expect(chunks.some((c) => c.type === "tool-call-args-text-finish")).toBe(
        true,
      );
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("keeps parallel tool-call args isolated while other parts stream", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const chunks = await decodeLines([
        'b:{"toolCallId":"t1","toolName":"search"}',
        'c:{"toolCallId":"t1","argsTextDelta":"{\\"q\\":\\""}',
        'b:{"toolCallId":"t2","toolName":"lookup"}',
        'c:{"toolCallId":"t2","argsTextDelta":"{\\"id\\":"}',
        '0:"working"',
        'c:{"toolCallId":"t1","argsTextDelta":"docs\\"}"}',
        'c:{"toolCallId":"t1","argsTextDelta":"","isFinal":true}',
        'c:{"toolCallId":"t2","argsTextDelta":"2}"}',
        'c:{"toolCallId":"t2","argsTextDelta":"","isFinal":true}',
      ]);

      const toolArgs = chunks
        .filter((chunk) => chunk.type === "text-delta")
        .reduce<Record<number, string>>((result, chunk) => {
          const partIndex = chunk.path[0]!;
          result[partIndex] = (result[partIndex] ?? "") + chunk.textDelta;
          return result;
        }, {});

      expect(toolArgs[0]).toBe('{"q":"docs"}');
      expect(toolArgs[1]).toBe('{"id":2}');
      expect(toolArgs[2]).toBe("working");
      expect(warn).not.toHaveBeenCalled();
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

import { afterEach, describe, expect, it, vi } from "vitest";
import { DataStreamDecoder, DataStreamEncoder } from "./DataStream";
import type { AssistantStreamChunk } from "../../AssistantStreamChunk";
import { createAssistantStreamController } from "../../modules/assistant-stream";
import { toolResultStream } from "../../tool/toolResultStream";

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
      { type: "tool-call-args-text-finish", path: [0] },
      { type: "part-finish", path: [0] },
    ]);

    expect(lines).toEqual([
      'b:{"toolCallId":"t1","toolName":"search"}',
      'c:{"toolCallId":"t1","argsTextDelta":"{\\"q\\":1}"}',
      'c:{"toolCallId":"t1","argsTextDelta":"","isFinal":true}',
    ]);
  });

  it("keeps backend results authoritative for tool execution", async () => {
    const execute = vi.fn(async () => "frontend result");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const [input, assistantController] = createAssistantStreamController();
      const toolCallController = assistantController.addToolCallPart({
        toolCallId: "t1",
        toolName: "ping",
      });
      const chunks: AssistantStreamChunk[] = [];
      const completion = input
        .pipeThrough(new DataStreamEncoder())
        .pipeThrough(new DataStreamDecoder())
        .pipeThrough(
          toolResultStream(
            {
              ping: {
                parameters: { type: "object", properties: {} },
                execute,
              },
            },
            new AbortController().signal,
            async () => undefined,
          ),
        )
        .pipeTo(
          new WritableStream({
            write(chunk) {
              chunks.push(chunk);
            },
          }),
        );

      toolCallController.setResponse({
        result: "backend result",
        isError: false,
      });
      assistantController.close();
      await completion;

      expect(execute).not.toHaveBeenCalled();
      expect(
        chunks
          .filter((chunk) => chunk.type === "result")
          .map((chunk) => (chunk.type === "result" ? chunk.result : undefined)),
      ).toEqual(["backend result"]);
      expect(
        chunks.some(
          (chunk) => chunk.type === "text-delta" && chunk.textDelta === "{}",
        ),
      ).toBe(true);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("finishes open args before stream boundary frames", async () => {
    const boundaries: Array<{
      chunk: AssistantStreamChunk;
      encodedPrefix: string;
    }> = [
      {
        chunk: {
          type: "step-finish",
          path: [],
          finishReason: "tool-calls",
          usage: { inputTokens: 1, outputTokens: 1 },
          isContinued: false,
        },
        encodedPrefix: "e:",
      },
      {
        chunk: {
          type: "message-finish",
          path: [],
          finishReason: "tool-calls",
          usage: { inputTokens: 1, outputTokens: 1 },
        },
        encodedPrefix: "d:",
      },
      {
        chunk: { type: "error", path: [], error: "failed" },
        encodedPrefix: "3:",
      },
    ];

    for (const { chunk, encodedPrefix } of boundaries) {
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
        chunk,
      ]);

      expect(lines.at(-2)).toBe(
        'c:{"toolCallId":"t1","argsTextDelta":"{}","isFinal":true}',
      );
      expect(lines.at(-1)?.startsWith(encodedPrefix)).toBe(true);
      // A decoder without `isFinal` support appends every delta and settles on
      // the concatenation, so it has to read as valid JSON on its own.
      const legacyArgsText = lines
        .filter((line) => line.startsWith("c:"))
        .map((line) => JSON.parse(line.slice(2)).argsTextDelta)
        .join("");
      expect(legacyArgsText).toBe("{}");
      expect(JSON.parse(legacyArgsText)).toEqual({});
    }
  });
});

describe("reasoning summaries on the data stream", () => {
  const reasoningPart = (summary?: string, text?: string) => {
    const chunks: AssistantStreamChunk[] = [
      {
        type: "part-start",
        path: [],
        part: {
          type: "reasoning",
          ...(summary !== undefined ? { unstable_summary: summary } : {}),
        },
      },
    ];
    if (text !== undefined) {
      chunks.push({ type: "text-delta", path: [0], textDelta: text });
    }
    return chunks;
  };

  it("carries the summary and keeps the text on one part", async () => {
    const lines = await encodeChunks(reasoningPart("Planning", "thinking"));

    expect(lines).toEqual([
      'aui-reasoning-part-start:{"unstable_summary":"Planning"}',
      'g:"thinking"',
    ]);

    const chunks = await decodeLines(lines);
    // one part-start, so the delta extends the part the summary opened
    expect(chunks.filter((chunk) => chunk.type === "part-start")).toHaveLength(
      1,
    );
    expect(
      chunks.find((chunk) => chunk.type === "part-start")?.part,
    ).toMatchObject({ type: "reasoning", unstable_summary: "Planning" });
  });

  it("gives a summary-only reasoning part a presence on the wire", async () => {
    const lines = await encodeChunks(reasoningPart("Planning"));

    expect(lines).toEqual([
      'aui-reasoning-part-start:{"unstable_summary":"Planning"}',
    ]);

    const chunks = await decodeLines(lines);
    expect(
      chunks.find((chunk) => chunk.type === "part-start")?.part,
    ).toMatchObject({ type: "reasoning", unstable_summary: "Planning" });
  });

  it("leaves a reasoning part without a summary byte-identical", async () => {
    expect(await encodeChunks(reasoningPart(undefined, "thinking"))).toEqual([
      'g:"thinking"',
    ]);
    expect(
      (await encodeChunks(reasoningPart(undefined))).filter(
        (line) => line.length > 0,
      ),
    ).toEqual([]);
  });

  it("gives each summarized reasoning step a part of its own", async () => {
    const chunks = await decodeLines([
      'aui-reasoning-part-start:{"unstable_summary":"First"}',
      'g:"one"',
      'aui-reasoning-part-start:{"unstable_summary":"Second"}',
      'g:"two"',
    ]);

    // a summary describes a step, so a second one must not be folded into the
    // part the first opened
    expect(
      chunks
        .filter((chunk) => chunk.type === "part-start")
        .map((chunk) => chunk.part),
    ).toEqual([
      { type: "reasoning", unstable_summary: "First" },
      { type: "reasoning", unstable_summary: "Second" },
    ]);
  });

  it("leaves an ordinary empty reasoning delta on the wire", async () => {
    // only the synthetic summary-part open suppresses an empty delta; a caller
    // that never touches the field keeps the frame it always emitted
    const [input, assistantController] = createAssistantStreamController();
    const output: string[] = [];
    const completion = input
      .pipeThrough(new DataStreamEncoder())
      .pipeThrough(new TextDecoderStream())
      .pipeTo(
        new WritableStream({
          write(chunk) {
            output.push(chunk);
          },
        }),
      );

    assistantController.appendReasoning("");
    assistantController.close();
    await completion;

    expect(output.join("").trimEnd().split("\n")).toEqual(['g:""']);
  });

  it("decodes a summary-only frame without a synthetic text delta", async () => {
    const chunks = await decodeLines([
      'aui-reasoning-part-start:{"unstable_summary":"Planning"}',
    ]);

    expect(chunks.filter((chunk) => chunk.type === "text-delta")).toEqual([]);
  });

  it("survives a decode and re-encode unchanged", async () => {
    // a relay that decodes and re-encodes must not inject frames the producer
    // never sent
    const lines = [
      'aui-reasoning-part-start:{"unstable_summary":"Planning"}',
      'g:"thinking"',
    ];

    const bytes = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        for (const line of lines)
          controller.enqueue(encoder.encode(line + "\n"));
        controller.close();
      },
    });
    const output: string[] = [];
    await bytes
      .pipeThrough(new DataStreamDecoder())
      .pipeThrough(new DataStreamEncoder())
      .pipeThrough(new TextDecoderStream())
      .pipeTo(
        new WritableStream({
          write(chunk) {
            output.push(chunk);
          },
        }),
      );

    expect(output.join("").trimEnd().split("\n")).toEqual(lines);
  });

  it("carries an explicitly empty summary", async () => {
    // transport preserves the value; only the display normalizer drops a part
    // with nothing to render
    expect(await encodeChunks(reasoningPart(""))).toEqual([
      'aui-reasoning-part-start:{"unstable_summary":""}',
    ]);
  });

  it("routes a parented summary to the same parent as its deltas", async () => {
    const lines = await encodeChunks([
      {
        type: "part-start",
        path: [],
        part: {
          type: "reasoning",
          parentId: "p1",
          unstable_summary: "Planning",
        },
      },
      { type: "text-delta", path: [0], textDelta: "thinking" },
    ]);

    expect(lines).toEqual([
      'aui-reasoning-part-start:{"unstable_summary":"Planning","parentId":"p1"}',
      'aui-reasoning-delta:{"reasoningDelta":"thinking","parentId":"p1"}',
    ]);

    const chunks = await decodeLines(lines);
    expect(chunks.filter((chunk) => chunk.type === "part-start")).toHaveLength(
      1,
    );
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

  it("preserves the empty-object fallback for a final marker", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const chunks = await decodeLines([
        'b:{"toolCallId":"t1","toolName":"ping"}',
        'c:{"toolCallId":"t1","argsTextDelta":"","isFinal":true}',
      ]);

      expect(
        chunks.some(
          (chunk) => chunk.type === "text-delta" && chunk.textDelta === "{}",
        ),
      ).toBe(true);
      expect(
        chunks.some((chunk) => chunk.type === "tool-call-args-text-finish"),
      ).toBe(true);
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

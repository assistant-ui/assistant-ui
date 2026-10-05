import { describe, expect, it } from "vitest";
import type { AssistantStreamChunk } from "../AssistantStreamChunk";
import type { ToolCallStreamController } from "../modules/tool-call";
import { DataStreamDecoder } from "./data-stream/DataStream";
import { createToolCallPartRegistry } from "./tool-call-part-registry";
import { UIMessageStreamDecoder } from "./ui-message-stream/UIMessageStream";

async function collectChunks<T>(stream: ReadableStream<T>): Promise<T[]> {
  const chunks: T[] = [];
  await stream.pipeTo(
    new WritableStream({
      write(chunk) {
        chunks.push(chunk);
      },
    }),
  );
  return chunks;
}

function decodeDataStreamChunks(chunks: string[]) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return collectChunks(stream.pipeThrough(new DataStreamDecoder()));
}

function decodeDataStream(lines: string[]) {
  return decodeDataStreamChunks(lines.map((line) => `${line}\n`));
}

function decodeUIMessageStreamChunks(chunks: string[]) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return collectChunks(stream.pipeThrough(new UIMessageStreamDecoder()));
}

function decodeUIMessageStream(events: string[]) {
  return decodeUIMessageStreamChunks([
    events.map((event) => `data: ${event}\n\n`).join(""),
  ]);
}

async function getErrorMessage(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (error instanceof Error) return error.message;
    throw error;
  }
  throw new Error("Expected decoder to throw");
}

describe("registry-backed decoders", () => {
  it("preserves the strict duplicate-start error", async () => {
    expect(
      await getErrorMessage(
        decodeDataStream([
          'b:{"toolCallId":"t1","toolName":"search"}',
          'b:{"toolCallId":"t1","toolName":"search"}',
        ]),
      ),
    ).toBe("Encountered duplicate tool call id: t1");
  });

  it("preserves the UI Message Stream unknown tool-result error", async () => {
    expect(
      await getErrorMessage(
        decodeUIMessageStream([
          JSON.stringify({
            type: "tool-result",
            toolCallId: "missing",
            result: "done",
          }),
          "[DONE]",
        ]),
      ),
    ).toBe("Encountered tool result with unknown id: missing");
  });

  it("preserves the UI Message Stream duplicate tool-call error", async () => {
    expect(
      await getErrorMessage(
        decodeUIMessageStream([
          JSON.stringify({
            type: "tool-call-start",
            toolCallId: "dup",
            toolName: "search",
          }),
          JSON.stringify({
            type: "tool-call-start",
            toolCallId: "dup",
            toolName: "search",
          }),
          "[DONE]",
        ]),
      ),
    ).toBe("Encountered duplicate tool call id: dup");
  });

  it("finishes args for an argsless complete tool call before its result", async () => {
    const chunks = await decodeDataStream([
      '9:{"toolCallId":"t1","toolName":"search"}',
      'a:{"toolCallId":"t1","result":"done"}',
    ]);

    const argsFinishIdx = chunks.findIndex(
      (chunk) => chunk.type === "tool-call-args-text-finish",
    );
    const resultIdx = chunks.findIndex((chunk) => chunk.type === "result");
    expect(argsFinishIdx).toBeGreaterThanOrEqual(0);
    expect(resultIdx).toBeGreaterThanOrEqual(0);
    expect(argsFinishIdx).toBeLessThan(resultIdx);
  });

  it("closes every open controller on flush", async () => {
    const chunks = await decodeDataStream([
      'b:{"toolCallId":"t1","toolName":"search"}',
      'b:{"toolCallId":"t2","toolName":"lookup"}',
    ]);

    expect(
      chunks.filter(
        (chunk): chunk is AssistantStreamChunk & { type: "part-finish" } =>
          chunk.type === "part-finish",
      ),
    ).toHaveLength(2);
  });

  it("keeps tool-call finish order independent of byte chunking", async () => {
    const first = '9:{"toolCallId":"t0","toolName":"search","args":{}}\n';
    const second = '9:{"toolCallId":"t1","toolName":"search","args":{}}\n';
    const selectOrder = (chunks: AssistantStreamChunk[]) =>
      chunks.map(({ type, path }) => ({ type, path }));

    const combined = await decodeDataStreamChunks([first + second]);
    const split = await decodeDataStreamChunks([first, second]);

    expect(selectOrder(split)).toEqual(selectOrder(combined));
    expect(
      combined
        .filter((chunk) => chunk.type === "part-finish")
        .map((chunk) => chunk.path),
    ).toEqual([[0], [1]]);
  });

  it.each([
    {
      label: "Data Stream",
      frames: [
        '9:{"toolCallId":"t0","toolName":"search","args":{}}\n',
        '9:{"toolCallId":"t1","toolName":"search","args":{}}\n',
        'a:{"toolCallId":"t0","result":"first"}\n',
        'a:{"toolCallId":"t1","result":"second"}\n',
      ],
      decode: decodeDataStreamChunks,
    },
    {
      label: "UI Message Stream",
      frames: [
        { type: "tool-input-available", toolCallId: "t0", input: {} },
        { type: "tool-input-available", toolCallId: "t1", input: {} },
        { type: "tool-output-available", toolCallId: "t0", output: "first" },
        {
          type: "tool-output-available",
          toolCallId: "t1",
          output: "second",
        },
        "[DONE]",
      ].map(
        (event) =>
          `data: ${typeof event === "string" ? event : JSON.stringify(event)}\n\n`,
      ),
      decode: decodeUIMessageStreamChunks,
    },
  ])(
    "keeps two final-result finishes stable across $label byte partitions",
    async ({ frames, decode }) => {
      const selectOrder = (chunks: AssistantStreamChunk[]) =>
        chunks.map(({ type, path }) => ({ type, path }));

      const combined = await decode([frames.join("")]);
      const split = await decode(frames);

      expect(selectOrder(split)).toEqual(selectOrder(combined));
      expect(
        combined
          .filter((chunk) => chunk.type === "part-finish")
          .map((chunk) => chunk.path),
      ).toEqual([[0], [1]]);
    },
  );
});

describe("createToolCallPartRegistry", () => {
  it("serializes final responses before their closes start", async () => {
    const registry = createToolCallPartRegistry();
    const order: string[] = [];
    let releaseFirst!: () => void;
    const firstReady = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const controller = (setResponse: () => void): ToolCallStreamController => ({
      argsText: {
        append() {},
        close() {},
      },
      close() {},
      setResponse,
    });
    const first = registry.start("t0", () =>
      controller(async () => {
        await firstReady;
        order.push("t0");
      }),
    );
    const second = registry.start("t1", () =>
      controller(() => {
        order.push("t1");
      }),
    );

    registry.setResponse(first, { result: "first" });
    registry.setResponse(second, { result: "second" });
    await Promise.resolve();
    const beforeRelease = [...order];
    releaseFirst();
    await registry.closeAll();

    expect(beforeRelease).toEqual([]);
    expect(order).toEqual(["t0", "t1"]);
  });

  it("awaits a final response already closing before the next controller", async () => {
    const registry = createToolCallPartRegistry();
    const order: string[] = [];
    let releaseFirst!: () => void;
    const firstReady = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let firstClosing = false;
    const first = registry.start("t0", () => ({
      argsText: {
        append() {},
        close() {},
      },
      async setResponse() {
        if (firstClosing) return;
        firstClosing = true;
        await firstReady;
        order.push("t0");
      },
      close() {
        if (!firstClosing) order.push("t0");
      },
    }));
    registry.start("t1", () => ({
      argsText: {
        append() {},
        close() {},
      },
      setResponse() {},
      close() {
        order.push("t1");
      },
    }));

    registry.setResponse(first, { result: "done" });
    registry.setResponse(first, { result: "ignored" });
    const closing = registry.closeAll();
    await Promise.resolve();
    const beforeRelease = [...order];
    releaseFirst();
    await closing;

    expect(beforeRelease).toEqual([]);
    expect(order).toEqual(["t0", "t1"]);
  });

  it("closes controllers sequentially in registry order", async () => {
    const registry = createToolCallPartRegistry();
    const order: string[] = [];
    let releaseFirst!: () => void;
    const firstReady = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const controller = (close: () => void): ToolCallStreamController => ({
      argsText: {
        append() {},
        close() {},
      },
      close,
      setResponse() {},
    });

    registry.start("t0", () =>
      controller(async () => {
        await firstReady;
        order.push("t0");
      }),
    );
    registry.start("t1", () =>
      controller(() => {
        order.push("t1");
      }),
    );

    const closing = registry.closeAll();
    await Promise.resolve();
    const beforeRelease = [...order];
    releaseFirst();
    await closing;

    expect(beforeRelease).toEqual([]);
    expect(order).toEqual(["t0", "t1"]);
  });
});

import { describe, expect, it } from "vitest";
import type { AssistantStreamChunk } from "../AssistantStreamChunk";
import { DataStreamDecoder } from "./data-stream/DataStream";
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

function decodeDataStream(lines: string[]) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(line + "\n"));
      controller.close();
    },
  });
  return collectChunks(stream.pipeThrough(new DataStreamDecoder()));
}

function decodeUIMessageStream(events: string[]) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encoder.encode(events.map((event) => `data: ${event}\n\n`).join("")),
      );
      controller.close();
    },
  });
  return collectChunks(stream.pipeThrough(new UIMessageStreamDecoder()));
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
});

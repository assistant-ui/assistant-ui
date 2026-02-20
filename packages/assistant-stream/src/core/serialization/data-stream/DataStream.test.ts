import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { AssistantStreamChunk } from "../../AssistantStreamChunk";
import { AssistantMessageAccumulator } from "../../accumulators/assistant-message-accumulator";
import { DataStreamDecoder, DataStreamEncoder } from "./DataStream";

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

async function encodeAndDecode(
  stream: ReadableStream<AssistantStreamChunk>,
): Promise<ReadableStream<AssistantStreamChunk>> {
  const encoded = stream.pipeThrough(new DataStreamEncoder());
  const encodedChunks = await collectChunks(encoded);

  const reconstructed = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of encodedChunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

  return reconstructed.pipeThrough(new DataStreamDecoder());
}

async function decodeDataStreamPayload(
  chunks: Array<{ type: string; value: unknown }>,
) {
  const payload = chunks
    .map((chunk) => `${chunk.type}:${JSON.stringify(chunk.value)}\n`)
    .join("");

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(payload));
      controller.close();
    },
  });

  return collectChunks(stream.pipeThrough(new DataStreamDecoder()));
}

async function decodeFixture(path: string) {
  const fixture = await readFile(new URL(path, import.meta.url), "utf8");
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(fixture));
      controller.close();
    },
  });

  return collectChunks(
    stream
      .pipeThrough(new DataStreamDecoder())
      .pipeThrough(new AssistantMessageAccumulator()),
  );
}

describe("DataStream component part support", () => {
  it("roundtrips component part-start chunks", async () => {
    const originalChunks: AssistantStreamChunk[] = [
      {
        type: "part-start",
        part: {
          type: "component",
          name: "status-chip",
          instanceId: "status-chip-1",
          props: { label: "Ready" },
          parentId: "group-1",
        },
        path: [],
      },
      { type: "part-finish", path: [0] },
    ];

    const stream = new ReadableStream<AssistantStreamChunk>({
      start(controller) {
        for (const chunk of originalChunks) controller.enqueue(chunk);
        controller.close();
      },
    });

    const decoded = await encodeAndDecode(stream);
    const decodedChunks = await collectChunks(decoded);

    expect(decodedChunks).toEqual(originalChunks);
  });

  it("roundtrips file part-start chunks", async () => {
    const originalChunks: AssistantStreamChunk[] = [
      {
        type: "part-start",
        part: {
          type: "file",
          data: "base64-data",
          mimeType: "image/png",
        },
        path: [],
      },
      { type: "part-finish", path: [0] },
    ];

    const stream = new ReadableStream<AssistantStreamChunk>({
      start(controller) {
        for (const chunk of originalChunks) controller.enqueue(chunk);
        controller.close();
      },
    });

    const decoded = await encodeAndDecode(stream);
    const decodedChunks = await collectChunks(decoded);

    expect(decodedChunks).toEqual(originalChunks);
  });

  it("ignores trailing partial lines during decode (abort/cancel tolerant)", async () => {
    const encoded = new TextEncoder().encode(`3:"boom"\n0:"truncated`);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoded);
        controller.close();
      },
    });

    const decodedChunks = await collectChunks(
      stream.pipeThrough(new DataStreamDecoder()),
    );

    expect(decodedChunks).toEqual([
      {
        type: "error",
        path: [],
        error: "boom",
      },
    ]);
  });

  it("supports interleaved tool-call args deltas without implicit closure", async () => {
    const decodedChunks = await decodeDataStreamPayload([
      {
        type: "b",
        value: { toolCallId: "tool-a", toolName: "weather" },
      },
      {
        type: "c",
        value: { toolCallId: "tool-a", argsTextDelta: '{"city":' },
      },
      {
        type: "b",
        value: { toolCallId: "tool-b", toolName: "clock" },
      },
      {
        type: "c",
        value: { toolCallId: "tool-b", argsTextDelta: '{"zone":"UTC"}' },
      },
      {
        type: "c",
        value: { toolCallId: "tool-a", argsTextDelta: '"NYC"}' },
      },
      {
        type: "d",
        value: {
          finishReason: "stop",
          usage: { inputTokens: 0, outputTokens: 0 },
        },
      },
    ]);

    const firstToolArgs = decodedChunks
      .filter(
        (
          chunk,
        ): chunk is Extract<AssistantStreamChunk, { type: "text-delta" }> =>
          chunk.type === "text-delta" && chunk.path[0] === 0,
      )
      .map((chunk) => chunk.textDelta);

    expect(firstToolArgs).toEqual(['{"city":', '"NYC"}']);
  });

  it("encodes explicit tool-call args close chunks", async () => {
    const stream = new ReadableStream<AssistantStreamChunk>({
      start(controller) {
        controller.enqueue({
          type: "part-start",
          path: [],
          part: {
            type: "tool-call",
            toolCallId: "tool-a",
            toolName: "weather",
          },
        });
        controller.enqueue({
          type: "text-delta",
          path: [0],
          textDelta: '{"city":"NYC"}',
        });
        controller.enqueue({
          type: "tool-call-args-text-finish",
          path: [0],
        });
        controller.close();
      },
    });

    const encodedChunks = await collectChunks(
      stream.pipeThrough(new DataStreamEncoder()),
    );
    const payload = encodedChunks
      .map((chunk) => new TextDecoder().decode(chunk))
      .join("");

    expect(payload).toContain('l:{"toolCallId":"tool-a"}');
  });

  it("supports explicit tool-call args closure by toolCallId during interleaving", async () => {
    const decodedChunks = await decodeDataStreamPayload([
      {
        type: "b",
        value: { toolCallId: "tool-a", toolName: "weather" },
      },
      {
        type: "c",
        value: { toolCallId: "tool-a", argsTextDelta: '{"city":' },
      },
      {
        type: "b",
        value: { toolCallId: "tool-b", toolName: "clock" },
      },
      {
        type: "c",
        value: { toolCallId: "tool-b", argsTextDelta: '{"zone":' },
      },
      {
        type: "l",
        value: { toolCallId: "tool-a" },
      },
      {
        type: "c",
        value: { toolCallId: "tool-b", argsTextDelta: '"UTC"}' },
      },
      {
        type: "d",
        value: {
          finishReason: "stop",
          usage: { inputTokens: 0, outputTokens: 0 },
        },
      },
    ]);

    expect(
      decodedChunks.filter(
        (chunk) => chunk.type === "tool-call-args-text-finish",
      ),
    ).toEqual([
      {
        type: "tool-call-args-text-finish",
        path: [0],
      },
      {
        type: "tool-call-args-text-finish",
        path: [1],
      },
    ]);

    const secondToolArgs = decodedChunks
      .filter(
        (
          chunk,
        ): chunk is Extract<AssistantStreamChunk, { type: "text-delta" }> =>
          chunk.type === "text-delta" && chunk.path[0] === 1,
      )
      .map((chunk) => chunk.textDelta);

    expect(secondToolArgs).toEqual(['{"zone":', '"UTC"}']);
  });

  it("replays component lifecycle fixture deterministically", async () => {
    const messages = await decodeFixture(
      "./__fixtures__/component-lifecycle.stage1.ndjson",
    );
    const last = messages.at(-1);

    expect(last?.parts).toMatchObject([
      {
        type: "component",
        name: "status-card",
        instanceId: "card1",
      },
    ]);

    expect(last?.metadata.unstable_state).toEqual({
      components: {
        card1: {
          sequence: 2,
          lifecycle: "active",
        },
      },
    });
  });
});

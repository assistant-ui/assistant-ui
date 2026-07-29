import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AssistantTransportDecoder } from "./AssistantTransport";
import { AssistantMessageAccumulator } from "../../accumulators/assistant-message-accumulator";
import type { AssistantStreamChunk } from "../../AssistantStreamChunk";
import type { AssistantMessage } from "../../utils/types";

// Fixture produced by the Python encoder; regenerate with
// `uv run python tests/generate_interop_fixture.py` in python/assistant-stream.
const fixture = readFileSync(
  new URL("./__fixtures__/python-encoder.sse", import.meta.url),
);

const EXPECTED_CHUNKS: AssistantStreamChunk[] = [
  { type: "step-start", messageId: "msg_1", path: [] },
  { type: "part-start", part: { type: "reasoning" }, path: [] },
  { type: "text-delta", textDelta: "Let me check the weather.", path: [0] },
  { type: "part-finish", path: [0] },
  { type: "part-start", part: { type: "text" }, path: [] },
  { type: "text-delta", textDelta: "Checking", path: [1] },
  { type: "text-delta", textDelta: " now.", path: [1] },
  { type: "part-finish", path: [1] },
  {
    type: "part-start",
    part: { type: "tool-call", toolCallId: "call_1", toolName: "get_weather" },
    path: [],
  },
  { type: "text-delta", textDelta: '{"city": ', path: [2] },
  { type: "text-delta", textDelta: '"NYC"}', path: [2] },
  {
    type: "update-state",
    operations: [{ type: "set", path: ["status"], value: "running" }],
    path: [],
  },
  { type: "result", result: { temp: 70 }, isError: false, path: [2] },
  { type: "tool-call-args-text-finish", path: [2] },
  { type: "part-finish", path: [2] },
  { type: "data", data: [{ progress: 1 }], path: [] },
  {
    type: "annotations",
    annotations: [{ type: "citation", id: "a1" }],
    path: [],
  },
  {
    type: "part-start",
    part: {
      type: "source",
      sourceType: "url",
      id: "s1",
      url: "https://example.com",
      title: "Example",
    },
    path: [],
  },
  { type: "part-finish", path: [3] },
  { type: "part-start", part: { type: "text" }, path: [] },
  { type: "text-delta", textDelta: "It is sunny.", path: [4] },
  { type: "part-finish", path: [4] },
  {
    type: "part-start",
    part: { type: "file", data: "aGVsbG8=", mimeType: "image/png" },
    path: [],
  },
  { type: "part-finish", path: [5] },
  {
    type: "step-finish",
    finishReason: "stop",
    usage: { inputTokens: 12, outputTokens: 34 },
    isContinued: false,
    path: [],
  },
];

const decodeFixture = async (chunkSize: number) => {
  const bytes = new Uint8Array(fixture);
  const stream = new ReadableStream<Uint8Array<ArrayBuffer>>({
    start(controller) {
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        controller.enqueue(
          new Uint8Array(bytes.slice(offset, offset + chunkSize)),
        );
      }
      controller.close();
    },
  });

  const chunks: AssistantStreamChunk[] = [];
  const reader = stream
    .pipeThrough(new AssistantTransportDecoder())
    .getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return chunks;
};

describe("Python encoder interop", () => {
  it("decodes the captured Python encoder output into canonical chunks", async () => {
    expect(await decodeFixture(fixture.length)).toEqual(EXPECTED_CHUNKS);
  });

  it("decodes the fixture identically under network fragmentation", async () => {
    expect(await decodeFixture(5)).toEqual(EXPECTED_CHUNKS);
  });

  it("accumulates the decoded fixture into a canonical message", async () => {
    const decoded = await decodeFixture(fixture.length);
    const source = new ReadableStream<AssistantStreamChunk>({
      start(controller) {
        for (const chunk of decoded) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    const messages: AssistantMessage[] = [];
    await source.pipeThrough(new AssistantMessageAccumulator()).pipeTo(
      new WritableStream({
        write(message) {
          messages.push(message);
        },
      }),
    );

    const message = messages.at(-1)!;
    expect(message.parts).toHaveLength(6);
    expect(message.parts[0]).toMatchObject({
      type: "reasoning",
      text: "Let me check the weather.",
    });
    expect(message.parts[1]).toMatchObject({
      type: "text",
      text: "Checking now.",
    });
    expect(message.parts[2]).toMatchObject({
      type: "tool-call",
      toolCallId: "call_1",
      toolName: "get_weather",
      state: "result",
      argsText: '{"city": "NYC"}',
      args: { city: "NYC" },
      result: { temp: 70 },
      isError: false,
    });
    expect(message.parts[3]).toMatchObject({
      type: "source",
      sourceType: "url",
      id: "s1",
      url: "https://example.com",
      title: "Example",
    });
    expect(message.parts[4]).toMatchObject({
      type: "text",
      text: "It is sunny.",
    });
    expect(message.parts[5]).toMatchObject({
      type: "file",
      mimeType: "image/png",
      data: "aGVsbG8=",
    });
    expect(message.metadata.unstable_state).toEqual({ status: "running" });
    expect(message.metadata.unstable_data).toEqual([{ progress: 1 }]);
    expect(message.metadata.unstable_annotations).toEqual([
      { type: "citation", id: "a1" },
    ]);
    expect(message.metadata.steps).toEqual([
      {
        state: "finished",
        messageId: "msg_1",
        finishReason: "stop",
        usage: { inputTokens: 12, outputTokens: 34 },
        isContinued: false,
      },
    ]);
  });
});

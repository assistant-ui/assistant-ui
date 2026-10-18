import { describe, expect, it } from "vitest";
import { UIMessageStreamDecoder } from "./UIMessageStream";
import { AssistantMessageAccumulator } from "../../accumulators/assistant-message-accumulator";
import type { AssistantMessage } from "../../utils/types";

async function decodeMessages(events: Record<string, unknown>[]) {
  const stream = new ReadableStream<Uint8Array<ArrayBuffer>>({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode(
          [...events.map((event) => JSON.stringify(event)), "[DONE]"]
            .map((event) => `data: ${event}\n\n`)
            .join(""),
        ),
      );
      controller.close();
    },
  });
  const messages: AssistantMessage[] = [];
  await stream
    .pipeThrough(new UIMessageStreamDecoder())
    .pipeThrough(new AssistantMessageAccumulator())
    .pipeTo(
      new WritableStream({
        write(value) {
          messages.push(value);
        },
      }),
    );
  return messages;
}

async function decode(events: Record<string, unknown>[]) {
  return (await decodeMessages(events)).at(-1)!;
}

describe("UIMessageStreamDecoder block identity", () => {
  it.each(["text", "reasoning"])(
    "updates %s provider metadata across start, delta, and end chunks",
    async (type) => {
      const startMetadata = { example: { phase: "start" } };
      const deltaMetadata = { example: { phase: "delta" } };
      const endMetadata = { example: { phase: "end" } };
      const makeDelta = (text: string, providerMetadata?: object) =>
        type === "text"
          ? {
              type: "text-delta",
              id: "part",
              textDelta: text,
              ...(providerMetadata && { providerMetadata }),
            }
          : {
              type: "reasoning-delta",
              id: "part",
              delta: text,
              ...(providerMetadata && { providerMetadata }),
            };
      const messages = await decodeMessages([
        {
          type: `${type}-start`,
          id: "part",
          providerMetadata: startMetadata,
        },
        makeDelta("Hello", deltaMetadata),
        makeDelta(" world"),
        { type: `${type}-end`, id: "part", providerMetadata: endMetadata },
      ]);

      expect(
        messages.map((message) => {
          const part = message.parts[0];
          return part?.type === "text" || part?.type === "reasoning"
            ? part.providerMetadata
            : undefined;
        }),
      ).toEqual([
        startMetadata,
        deltaMetadata,
        deltaMetadata,
        endMetadata,
        endMetadata,
      ]);
    },
  );

  it.each(["text", "reasoning"])(
    "keeps interleaved %s blocks separate",
    async (type) => {
      const message = await decode([
        { type: "start", messageId: "message" },
        { type: `${type}-start`, id: "first" },
        { type: `${type}-delta`, id: "first", delta: "First " },
        { type: `${type}-start`, id: "second" },
        { type: `${type}-delta`, id: "second", delta: "Second " },
        { type: `${type}-delta`, id: "first", delta: "answer." },
        { type: `${type}-end`, id: "first" },
        { type: `${type}-delta`, id: "second", delta: "answer." },
        { type: `${type}-end`, id: "second" },
        { type: "finish", finishReason: "stop" },
      ]);
      expect(message.parts).toMatchObject([
        { type, text: "First answer.", status: { type: "complete" } },
        { type, text: "Second answer.", status: { type: "complete" } },
      ]);
    },
  );

  it.each(["text", "reasoning"])(
    "preserves adjacent %s block boundaries",
    async (type) => {
      const message = await decode([
        { type: `${type}-start`, id: "first" },
        { type: `${type}-delta`, id: "first", delta: "First answer." },
        { type: `${type}-end`, id: "first" },
        { type: `${type}-start`, id: "second" },
        { type: `${type}-delta`, id: "second", delta: "Second answer." },
        { type: `${type}-end`, id: "second" },
      ]);
      expect(message.parts).toMatchObject([
        { type, text: "First answer." },
        { type, text: "Second answer." },
      ]);
    },
  );

  it("keeps a text block intact while reasoning arrives", async () => {
    const message = await decode([
      { type: "text-start", id: "shared" },
      { type: "text-delta", id: "shared", delta: "Answer: " },
      { type: "reasoning-start", id: "shared" },
      { type: "reasoning-delta", id: "shared", delta: "Thinking." },
      { type: "text-delta", id: "shared", delta: "42" },
      { type: "reasoning-end", id: "shared" },
      { type: "text-end", id: "shared" },
    ]);
    expect(message.parts).toMatchObject([
      { type: "text", text: "Answer: 42" },
      { type: "reasoning", text: "Thinking." },
    ]);
  });

  it.each(["text", "reasoning"])(
    "closes unfinished %s blocks at EOF",
    async (type) => {
      const message = await decode([
        { type: `${type}-start`, id: "first" },
        { type: `${type}-delta`, id: "first", delta: "First answer." },
        { type: `${type}-start`, id: "second" },
        { type: `${type}-delta`, id: "second", delta: "Second answer." },
      ]);
      expect(message.parts).toMatchObject([
        { type, text: "First answer.", status: { type: "complete" } },
        { type, text: "Second answer.", status: { type: "complete" } },
      ]);
    },
  );

  it.each(["text", "reasoning"])(
    "supports legacy %s deltas and ends without IDs",
    async (type) => {
      const legacyMetadata = { example: { kind: type } };
      const delta = (text: string, providerMetadata?: object) =>
        type === "text"
          ? {
              type: "text-delta",
              textDelta: text,
              ...(providerMetadata && { providerMetadata }),
            }
          : {
              type: "reasoning-delta",
              delta: text,
              ...(providerMetadata && { providerMetadata }),
            };
      const message = await decode([
        delta("Before a start.", legacyMetadata),
        { type: `${type}-start`, id: "part" },
        delta("Inside the block."),
        { type: `${type}-end` },
        delta("After an end."),
      ]);
      expect(message.parts).toMatchObject([
        {
          type,
          text: "Before a start.",
          providerMetadata: legacyMetadata,
        },
        { type, text: "Inside the block." },
        { type, text: "After an end." },
      ]);
    },
  );

  it.each(["text", "reasoning"])(
    "reuses a %s block ID after a step ends",
    async (type) => {
      const message = await decode([
        { type: "start", messageId: "message" },
        { type: "start-step" },
        { type: `${type}-start`, id: "part" },
        { type: `${type}-delta`, id: "part", delta: "First step." },
        { type: "finish-step" },
        { type: "start-step" },
        { type: `${type}-start`, id: "part" },
        { type: `${type}-delta`, id: "part", delta: "Second step." },
        { type: "finish-step" },
        { type: "finish" },
      ]);
      expect(message.parts).toMatchObject([
        { type, text: "First step.", status: { type: "complete" } },
        { type, text: "Second step.", status: { type: "complete" } },
      ]);
    },
  );
});

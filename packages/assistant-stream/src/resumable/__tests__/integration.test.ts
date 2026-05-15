import { describe, expect, it } from "vitest";
import {
  RESUMABLE_STREAM_ID_HEADER,
  createResumableAssistantStreamResponse,
  createResumeAssistantStreamResponse,
} from "../createResumableAssistantStreamResponse";
import { createResumableStreamContext } from "../ResumableStreamContext";
import { createInMemoryResumableStreamStore } from "../stores/InMemoryResumableStreamStore";
import {
  AssistantTransportDecoder,
  AssistantTransportEncoder,
} from "../../core/serialization/assistant-transport/AssistantTransport";
import { DataStreamDecoder } from "../../core/serialization/data-stream/DataStream";
import { AssistantMessageAccumulator } from "../../core/accumulators/assistant-message-accumulator";
import type { AssistantStreamChunk } from "../../core/AssistantStreamChunk";
import type { AssistantMessage } from "../../core/utils/types";

async function decodeViaDataStream(body: ReadableStream<Uint8Array>) {
  const stream = body.pipeThrough(new DataStreamDecoder());
  const out: string[] = [];
  for await (const chunk of stream) {
    if (chunk.type === "text-delta") out.push(chunk.textDelta);
  }
  return out.join("");
}

async function accumulate(
  body: ReadableStream<Uint8Array>,
  decoder: TransformStream<Uint8Array, AssistantStreamChunk>,
): Promise<AssistantMessage> {
  const messages = body
    .pipeThrough(decoder)
    .pipeThrough(new AssistantMessageAccumulator());
  let last: AssistantMessage | undefined;
  for await (const msg of messages) last = msg;
  if (!last) throw new Error("accumulator yielded no messages");
  return last;
}

describe("resumable integration", () => {
  it("ten concurrent consumers see identical bytes for a 50 chunk stream", async () => {
    const ctx = createResumableStreamContext({
      store: createInMemoryResumableStreamStore(),
    });

    const producer = await createResumableAssistantStreamResponse({
      context: ctx,
      streamId: "fanout",
      callback: async (controller) => {
        for (let i = 0; i < 50; i++) {
          controller.appendText(`chunk-${i}`);
          await Promise.resolve();
        }
      },
    });

    const consumers = await Promise.all(
      Array.from({ length: 10 }, async () => {
        const r = await ctx.resume("fanout");
        if (!r) throw new Error("resume returned null");
        return new Response(r).arrayBuffer();
      }),
    );
    const producerBytes = await new Response(producer.body).arrayBuffer();

    const expected = new Uint8Array(producerBytes);
    for (const c of consumers) {
      expect(new Uint8Array(c)).toEqual(expected);
    }

    const text = await decodeViaDataStream(
      new Response(new Uint8Array(producerBytes)).body!,
    );
    expect(text).toBe(
      Array.from({ length: 50 }, (_, i) => `chunk-${i}`).join(""),
    );
  });

  it("non-ASCII payload round-trips byte-for-byte through resume", async () => {
    const allCodePoints = Array.from({ length: 256 }, (_, i) =>
      String.fromCodePoint(i),
    ).join("");
    const emoji = "hello 🌍 🚀 ✨";
    const payload = allCodePoints + emoji;

    const ctx = createResumableStreamContext({
      store: createInMemoryResumableStreamStore(),
    });
    const producer = await createResumableAssistantStreamResponse({
      context: ctx,
      streamId: "binary",
      callback: (controller) => controller.appendText(payload),
    });
    const producerBytes = new Uint8Array(
      await new Response(producer.body).arrayBuffer(),
    );

    const replay = await createResumeAssistantStreamResponse({
      context: ctx,
      streamId: "binary",
    });
    const replayBytes = new Uint8Array(
      await new Response(replay.body).arrayBuffer(),
    );
    expect(replayBytes).toEqual(producerBytes);
    expect(replay.headers.get(RESUMABLE_STREAM_ID_HEADER)).toBe("binary");

    const decoded = await decodeViaDataStream(new Response(replayBytes).body!);
    expect(decoded).toBe(payload);
  });

  it("AssistantTransportEncoder round-trips through resume into an identical message", async () => {
    const ctx = createResumableStreamContext({
      store: createInMemoryResumableStreamStore(),
    });
    const producer = await createResumableAssistantStreamResponse({
      context: ctx,
      streamId: "transport",
      encoder: () => new AssistantTransportEncoder(),
      callback: (controller) => {
        controller.appendText("processing... ");
        const tool = controller.addToolCallPart({
          toolName: "lookup",
          toolCallId: "tool-1",
          args: { query: "weather" },
          response: { result: { temperature: 72 } },
        });
        tool.close();
        controller.appendText("done");
      },
    });
    const producerMessage = await accumulate(
      producer.body!,
      new AssistantTransportDecoder(),
    );

    const replay = await createResumeAssistantStreamResponse({
      context: ctx,
      streamId: "transport",
      encoder: () => new AssistantTransportEncoder(),
    });
    expect(replay.headers.get("content-type")).toBe("text/event-stream");
    const replayMessage = await accumulate(
      replay.body!,
      new AssistantTransportDecoder(),
    );

    expect(replayMessage.parts).toEqual(producerMessage.parts);
    expect(replayMessage.status).toEqual(producerMessage.status);
    const toolPart = replayMessage.parts.find((p) => p.type === "tool-call");
    expect(toolPart).toBeDefined();
    expect(toolPart).toMatchObject({
      toolName: "lookup",
      toolCallId: "tool-1",
      args: { query: "weather" },
      result: { temperature: 72 },
    });
  });
});

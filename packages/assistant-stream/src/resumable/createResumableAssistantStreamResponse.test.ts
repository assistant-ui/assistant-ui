import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  RESUMABLE_STREAM_ID_HEADER,
  createResumableAssistantStreamResponse,
  createResumeAssistantStreamResponse,
} from "./createResumableAssistantStreamResponse";
import { createResumableStreamContext } from "./ResumableStreamContext";
import { ResumableStreamError } from "./errors";
import { createInMemoryResumableStreamStore } from "./stores/InMemoryResumableStreamStore";
import { DataStreamDecoder } from "../core/serialization/data-stream/DataStream";
import { AssistantTransportEncoder } from "../core/serialization/assistant-transport/AssistantTransport";
import { AssistantMessageAccumulator } from "../core/accumulators/assistant-message-accumulator";
import type { AssistantStreamChunk } from "../core/AssistantStreamChunk";

async function decodeAssistantText(response: Response): Promise<string> {
  const chunks: AssistantStreamChunk[] = [];
  const stream = response.body!.pipeThrough(new DataStreamDecoder());
  for await (const chunk of stream) chunks.push(chunk);

  const acc = new AssistantMessageAccumulator();
  const messageStream = new ReadableStream<AssistantStreamChunk>({
    start(c) {
      for (const ch of chunks) c.enqueue(ch);
      c.close();
    },
  }).pipeThrough(acc);

  const reader = messageStream.getReader();
  let last:
    | { parts: ReadonlyArray<{ type: string; text?: string }> }
    | undefined;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    last = value;
  }
  return (
    last?.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") ?? ""
  );
}

describe("createResumableAssistantStreamResponse", () => {
  it("produces a response that decodes through DataStreamDecoder", async () => {
    const ctx = createResumableStreamContext({
      store: createInMemoryResumableStreamStore(),
    });
    const response = await createResumableAssistantStreamResponse({
      context: ctx,
      streamId: "s1",
      callback: (controller) => {
        controller.appendText("hello ");
        controller.appendText("world");
      },
    });

    expect(response.headers.get(RESUMABLE_STREAM_ID_HEADER)).toBe("s1");
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await decodeAssistantText(response)).toBe("hello world");
  });

  it("resume endpoint replays the same payload byte-for-byte", async () => {
    const store = createInMemoryResumableStreamStore();
    const ctx = createResumableStreamContext({ store });

    const first = await createResumableAssistantStreamResponse({
      context: ctx,
      streamId: "s1",
      callback: (controller) => {
        controller.appendText("alpha");
        const tool = controller.addToolCallPart({
          toolName: "echo",
          toolCallId: "t1",
          args: { v: 1 },
          response: { result: { ok: true } },
        });
        tool.close();
      },
    });
    const firstBytes = await new Response(first.body).arrayBuffer();

    const second = await createResumeAssistantStreamResponse({
      context: ctx,
      streamId: "s1",
    });
    const secondBytes = await new Response(second.body).arrayBuffer();

    expect(new Uint8Array(secondBytes)).toEqual(new Uint8Array(firstBytes));
    expect(second.headers.get(RESUMABLE_STREAM_ID_HEADER)).toBe("s1");
  });

  it("resume returns 404 when streamId is unknown", async () => {
    const ctx = createResumableStreamContext({
      store: createInMemoryResumableStreamStore(),
    });
    const response = await createResumeAssistantStreamResponse({
      context: ctx,
      streamId: "missing",
    });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "stream not found" });
  });

  it("custom encoder factory survives across producer + consumer", async () => {
    const ctx = createResumableStreamContext({
      store: createInMemoryResumableStreamStore(),
    });
    const response = await createResumableAssistantStreamResponse({
      context: ctx,
      streamId: "s1",
      encoder: () => new AssistantTransportEncoder(),
      callback: (controller) => controller.appendText("hi"),
    });

    expect(response.headers.get("content-type")).toBe("text/event-stream");
    const text = await new Response(response.body).text();
    expect(text).toContain("text-delta");
    expect(text).toContain("[DONE]");
  });

  it("user headers override encoder defaults but not the stream id header", async () => {
    const ctx = createResumableStreamContext({
      store: createInMemoryResumableStreamStore(),
    });
    const response = await createResumableAssistantStreamResponse({
      context: ctx,
      streamId: "s1",
      headers: {
        "Cache-Control": "private, max-age=0",
        [RESUMABLE_STREAM_ID_HEADER]: "spoofed",
      },
      callback: (controller) => controller.appendText("hi"),
    });
    expect(response.headers.get("cache-control")).toBe("private, max-age=0");
    expect(response.headers.get(RESUMABLE_STREAM_ID_HEADER)).toBe("s1");
    await response.body!.cancel();
  });

  describe("producer crash", () => {
    let suppressed: unknown[];
    let original: NodeJS.UnhandledRejectionListener[];
    const swallow: NodeJS.UnhandledRejectionListener = (reason) => {
      suppressed.push(reason);
    };

    beforeEach(() => {
      suppressed = [];
      original = process.listeners("unhandledRejection");
      for (const l of original) process.off("unhandledRejection", l);
      process.on("unhandledRejection", swallow);
    });

    afterEach(async () => {
      await new Promise((r) => setTimeout(r, 20));
      process.off("unhandledRejection", swallow);
      for (const l of original) process.on("unhandledRejection", l);
    });

    it("synchronous callback throw is encoded into the body and finalizes the stream", async () => {
      const ctx = createResumableStreamContext({
        store: createInMemoryResumableStreamStore(),
      });
      const response = await createResumableAssistantStreamResponse({
        context: ctx,
        streamId: "s1",
        callback: () => {
          throw new Error("boom");
        },
      });
      expect(response.status).toBe(200);

      const firstBytes = await new Response(response.body).arrayBuffer();
      expect(new TextDecoder().decode(firstBytes)).toContain("Error: boom");

      while ((await ctx.status("s1")) === "streaming") {
        await new Promise((r) => setTimeout(r, 5));
      }
      expect(await ctx.status("s1")).toBe("done");

      const replay = await ctx.resume("s1");
      expect(replay).not.toBeNull();
      const replayBytes = await new Response(replay).arrayBuffer();
      expect(new Uint8Array(replayBytes)).toEqual(new Uint8Array(firstBytes));

      while (suppressed.length === 0) {
        await new Promise((r) => setTimeout(r, 5));
      }
      expect(suppressed.map((e) => (e as Error).message)).toContain("boom");
    });
  });

  it("requireResume rejects with ResumableStreamError(missing) for unknown ids", async () => {
    const ctx = createResumableStreamContext({
      store: createInMemoryResumableStreamStore(),
    });
    let captured: unknown;
    try {
      await ctx.requireResume("nonexistent");
    } catch (e) {
      captured = e;
    }
    expect(captured).toBeInstanceOf(ResumableStreamError);
    expect((captured as ResumableStreamError).code).toBe("missing");
  });

  it("mid-stream consumer joins active production and receives every chunk in order", async () => {
    const ctx = createResumableStreamContext({
      store: createInMemoryResumableStreamStore(),
    });

    let emitted = 0;
    const producerDone = createResumableAssistantStreamResponse({
      context: ctx,
      streamId: "s1",
      callback: async (controller) => {
        for (let i = 0; i < 5; i++) {
          await new Promise((r) => setTimeout(r, 5));
          controller.appendText(`chunk${i};`);
          emitted += 1;
        }
      },
    });

    const producer = await producerDone;

    while (emitted < 2) {
      await new Promise((r) => setTimeout(r, 1));
    }

    const replay = await ctx.resume("s1");
    expect(replay).not.toBeNull();

    const [producerBody, replayText] = await Promise.all([
      new Response(producer.body).arrayBuffer(),
      decodeAssistantText(new Response(replay)),
    ]);
    expect(producerBody.byteLength).toBeGreaterThan(0);
    expect(replayText).toBe("chunk0;chunk1;chunk2;chunk3;chunk4;");
  });
});

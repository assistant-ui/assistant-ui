import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  AssistantStreamChunk,
  PartInit,
} from "../core/AssistantStreamChunk";
import { AssistantMessageAccumulator } from "../core/accumulators/assistant-message-accumulator";
import { createAssistantStream } from "../core/modules/assistant-stream";
import type { AssistantMessagePart } from "../core/utils/types";

const accumulate = async (chunks: AssistantStreamChunk[]) => {
  const stream = new ReadableStream<AssistantStreamChunk>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  }).pipeThrough(new AssistantMessageAccumulator({ throttle: false }));

  const messages = [];
  for await (const message of stream) messages.push(message);
  return messages.at(-1)!;
};

const collectChunks = async (stream: ReadableStream<AssistantStreamChunk>) => {
  const chunks: AssistantStreamChunk[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return chunks;
};

describe("video stream part", () => {
  it("types video PartInit and AssistantMessagePart", () => {
    const part: PartInit = {
      type: "video",
      url: "https://cdn.example.com/video.mp4",
      mimeType: "video/mp4",
      filename: "video.mp4",
      posterUrl: "https://cdn.example.com/poster.jpg",
      width: 1280,
      height: 720,
      durationSeconds: 4,
      providerMetadata: { model: "example" },
    };

    const messagePart: AssistantMessagePart = {
      ...part,
      status: { type: "complete", reason: "unknown" },
    };

    expectTypeOf(part).toMatchTypeOf<PartInit>();
    expectTypeOf(messagePart).toMatchTypeOf<AssistantMessagePart>();
  });

  it("accumulates video part-start into assistant message parts", async () => {
    const message = await accumulate([
      {
        type: "part-start",
        path: [],
        part: {
          type: "video",
          url: "https://cdn.example.com/video.mp4",
          mimeType: "video/mp4",
          filename: "video.mp4",
          posterUrl: "https://cdn.example.com/poster.jpg",
          width: 1280,
          height: 720,
          durationSeconds: 4,
        },
      },
      { type: "part-finish", path: [0] },
    ]);

    expect(message.parts[0]).toEqual({
      type: "video",
      url: "https://cdn.example.com/video.mp4",
      mimeType: "video/mp4",
      filename: "video.mp4",
      posterUrl: "https://cdn.example.com/poster.jpg",
      width: 1280,
      height: 720,
      durationSeconds: 4,
      status: { type: "complete", reason: "unknown" },
    });
  });

  it("appendVideo emits a finished video part", async () => {
    const stream = createAssistantStream((controller) => {
      controller.appendVideo({
        url: "https://cdn.example.com/video.mp4",
        mimeType: "video/mp4",
        filename: "video.mp4",
      });
    });

    const chunks = await collectChunks(stream);
    expect(chunks).toEqual([
      {
        type: "part-start",
        path: [],
        part: {
          type: "video",
          url: "https://cdn.example.com/video.mp4",
          mimeType: "video/mp4",
          filename: "video.mp4",
        },
      },
      { type: "part-finish", path: [0] },
    ]);
  });
});

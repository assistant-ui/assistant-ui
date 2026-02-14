import { describe, expect, it } from "vitest";
import type { AssistantStreamChunk } from "../../AssistantStreamChunk";
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

describe("DataStream component part support", () => {
  it("roundtrips component part-start chunks", async () => {
    const originalChunks: AssistantStreamChunk[] = [
      {
        type: "part-start",
        part: {
          type: "component",
          name: "status-chip",
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
});

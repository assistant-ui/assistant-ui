import { bench, describe } from "vitest";
import {
  DataStreamDecoder,
  DataStreamEncoder,
  type AssistantStreamChunk,
} from "assistant-stream";

const makeChunks = (deltas: number, chars: number): AssistantStreamChunk[] => {
  const text = "x".repeat(chars);
  return [
    { type: "part-start", path: [], part: { type: "text" } },
    ...Array.from({ length: deltas }, (): AssistantStreamChunk => ({
      type: "text-delta",
      path: [0],
      textDelta: text,
    })),
    { type: "part-finish", path: [0] },
  ];
};

const chunkSource = (chunks: AssistantStreamChunk[]) =>
  new ReadableStream<AssistantStreamChunk>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });

const byteSource = (bytes: Uint8Array<ArrayBuffer>[]) =>
  new ReadableStream<Uint8Array<ArrayBuffer>>({
    start(controller) {
      for (const b of bytes) controller.enqueue(b);
      controller.close();
    },
  });

const drain = async (readable: ReadableStream<unknown>) => {
  const reader = readable.getReader();
  while (!(await reader.read()).done);
};

const encodeAll = async (chunks: AssistantStreamChunk[]) => {
  const bytes: Uint8Array<ArrayBuffer>[] = [];
  const reader = chunkSource(chunks)
    .pipeThrough(new DataStreamEncoder())
    .getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return bytes;
    bytes.push(value);
  }
};

const SIZES = [100, 1000, 4000];
const wireBySize = new Map<number, Uint8Array<ArrayBuffer>[]>();
for (const n of SIZES) {
  wireBySize.set(n, await encodeAll(makeChunks(n, 16)));
}

describe("assistant-stream: data stream encode (16-char deltas)", () => {
  for (const n of SIZES) {
    const chunks = makeChunks(n, 16);
    bench(`${n} deltas`, async () => {
      await drain(chunkSource(chunks).pipeThrough(new DataStreamEncoder()));
    });
  }
});

describe("assistant-stream: data stream decode (16-char deltas)", () => {
  for (const n of SIZES) {
    const wire = wireBySize.get(n)!;
    bench(`${n} deltas`, async () => {
      await drain(byteSource(wire).pipeThrough(new DataStreamDecoder()));
    });
  }
});

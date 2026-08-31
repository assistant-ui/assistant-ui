import { bench, describe } from "vitest";
import {
  AssistantMessageStream,
  type AssistantStreamChunk,
} from "assistant-stream";

const makeChunks = (deltas: number, chars: number): AssistantStreamChunk[] => {
  const text = "x".repeat(chars);
  return [
    { type: "part-start", path: [0], part: { type: "text" } },
    ...Array.from({ length: deltas }, (): AssistantStreamChunk => ({
      type: "text-delta",
      path: [0],
      textDelta: text,
    })),
    { type: "part-finish", path: [0] },
  ];
};

const drain = async (chunks: AssistantStreamChunk[]) => {
  const source = new ReadableStream<AssistantStreamChunk>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  await AssistantMessageStream.fromAssistantStream(source).unstable_result();
};

const drainRaw = async (chunks: AssistantStreamChunk[]) => {
  const source = new ReadableStream<AssistantStreamChunk>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  const reader = source.getReader();
  while (!(await reader.read()).done);
};

describe("assistant-stream: stream + accumulator per-delta cost (16-char deltas)", () => {
  for (const n of [100, 1000, 4000]) {
    const chunks = makeChunks(n, 16);
    bench(`${n} deltas`, async () => {
      await drain(chunks);
    });
  }
});

describe("assistant-stream: stream round trip baseline, no accumulator", () => {
  for (const n of [100, 1000, 4000]) {
    const chunks = makeChunks(n, 16);
    bench(`${n} deltas`, async () => {
      await drainRaw(chunks);
    });
  }
});

describe("assistant-stream: same 4000-char text, chunk size A/B", () => {
  const cases = [
    ["4000 deltas × 1 char (per-token)", makeChunks(4000, 1)],
    ["250 deltas × 16 chars", makeChunks(250, 16)],
    ["16 deltas × 250 chars", makeChunks(16, 250)],
  ] as const;
  for (const [name, chunks] of cases) {
    bench(name, async () => {
      await drain(chunks);
    });
  }
});

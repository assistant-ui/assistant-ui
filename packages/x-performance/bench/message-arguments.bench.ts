import { beforeAll, describe, test, vi } from "vitest";
import {
  AssistantMessageStream,
  type AssistantStreamChunk,
} from "assistant-stream";
import { prepareStreamfold as prepareAssistantStreamfold } from "../../assistant-stream/dist/utils/json/streamfold-arguments.js";
import { StructuredStreamPool } from "streamfold";

const scenarios = [
  {
    name: "weather / 16 chars",
    args: { city: "San Francisco", units: "celsius" },
    chunkSize: 16,
  },
  {
    name: "1 KB string / 16 chars",
    args: { value: "x".repeat(1000) },
    chunkSize: 16,
  },
  {
    name: "50 KB string / 16 chars",
    args: { value: "x".repeat(50000) },
    chunkSize: 16,
    retained: true,
  },
  {
    name: "50 KB string / 256 chars",
    args: { value: "x".repeat(50000) },
    chunkSize: 256,
    retained: true,
  },
  {
    name: "two long escaped Unicode strings / 4 chars",
    args: {
      first: 'A "sunny" day in café 東京.\n'.repeat(240),
      details: { temperature: -12.75, available: true, labels: ["東京", null] },
      second: 'A "clear" evening in café 東京.\n'.repeat(240),
    },
    chunkSize: 4,
    retained: true,
  },
  {
    name: "nested items / 64 chars",
    args: {
      items: Array.from({ length: 128 }, (_, index) => ({
        name: `item ${index}`,
        value: index,
        ready: true,
      })),
    },
    chunkSize: 64,
  },
  {
    name: "complete 50 KB string / single chunk",
    args: { value: "x".repeat(50000) },
    chunkSize: 100000,
  },
  {
    name: "long string followed by nested items / 64 chars",
    args: {
      summary: "x".repeat(16000),
      items: Array.from({ length: 128 }, (_, index) => ({
        name: `item ${index}`,
        value: index,
        ready: true,
      })),
    },
    chunkSize: 64,
    retained: true,
  },
];

const chunksFor = (args: unknown, chunkSize: number) => {
  const text = JSON.stringify(args);
  return [
    {
      type: "part-start",
      path: [],
      part: { type: "tool-call", toolCallId: "call", toolName: "example" },
    },
    ...Array.from(
      { length: Math.ceil(text.length / chunkSize) },
      (_, i): AssistantStreamChunk => ({
        type: "text-delta",
        path: [0],
        textDelta: text.slice(i * chunkSize, (i + 1) * chunkSize),
      }),
    ),
    { type: "tool-call-args-text-finish", path: [0] },
  ] satisfies AssistantStreamChunk[];
};

const accumulate = async (chunks: AssistantStreamChunk[]) => {
  const source = new ReadableStream<AssistantStreamChunk>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  return AssistantMessageStream.fromAssistantStream(source).unstable_result();
};

beforeAll(async () => {
  if (process.env["AUI_PERF_REF_ROOT"]) return;
  await prepareAssistantStreamfold();
  const push = vi.spyOn(StructuredStreamPool.prototype, "push");
  try {
    for (const scenario of scenarios) {
      if (!("retained" in scenario && scenario.retained)) continue;
      const before = push.mock.calls.length;
      for (let attempt = 0; attempt < 2; attempt++) {
        await accumulate(chunksFor(scenario.args, scenario.chunkSize));
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      if (push.mock.calls.length === before)
        throw new Error(`${scenario.name} did not use retained parsing`);
    }
  } finally {
    push.mockRestore();
  }
});

describe("assistant-stream: accumulated tool arguments", () => {
  for (const { name, args, chunkSize } of scenarios) {
    const text = JSON.stringify(args);
    const chunks = chunksFor(args, chunkSize);
    test(name, async ({ bench }) => {
      await bench(name, async () => {
        const result = await accumulate(chunks);
        const part = result.parts[0];
        if (part?.type !== "tool-call" || JSON.stringify(part.args) !== text)
          throw new Error("Accumulated arguments did not match the input");
      }).run();
    });
  }
});

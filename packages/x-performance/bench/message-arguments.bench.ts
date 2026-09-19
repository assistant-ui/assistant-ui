import { describe, test } from "vitest";
import {
  AssistantMessageStream,
  type AssistantStreamChunk,
} from "assistant-stream";

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
  },
  {
    name: "50 KB string / 256 chars",
    args: { value: "x".repeat(50000) },
    chunkSize: 256,
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
  },
];

describe("assistant-stream: accumulated tool arguments", () => {
  for (const { name, args, chunkSize } of scenarios) {
    const text = JSON.stringify(args);
    const chunks: AssistantStreamChunk[] = [
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
    ];
    test(name, async ({ bench }) => {
      await bench(name, async () => {
        const source = new ReadableStream<AssistantStreamChunk>({
          start(controller) {
            for (const chunk of chunks) controller.enqueue(chunk);
            controller.close();
          },
        });
        const result =
          await AssistantMessageStream.fromAssistantStream(
            source,
          ).unstable_result();
        const part = result.parts[0];
        if (part?.type !== "tool-call" || JSON.stringify(part.args) !== text)
          throw new Error("Accumulated arguments did not match the input");
      }).run();
    });
  }
});

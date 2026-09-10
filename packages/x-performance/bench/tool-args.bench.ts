import { bench, describe } from "vitest";
import {
  unstable_toolResultStream,
  type AssistantStreamChunk,
} from "assistant-stream";

const makeChunks = (
  size: number,
  chunkSize: number,
): AssistantStreamChunk[] => {
  const argsText = JSON.stringify({ value: "x".repeat(size) });
  return [
    {
      type: "part-start",
      path: [],
      part: {
        type: "tool-call",
        toolCallId: "tool-call",
        toolName: "noop",
      },
    },
    ...Array.from(
      { length: Math.ceil(argsText.length / chunkSize) },
      (_, index): AssistantStreamChunk => ({
        type: "text-delta",
        path: [0],
        textDelta: argsText.slice(index * chunkSize, (index + 1) * chunkSize),
      }),
    ),
    { type: "tool-call-args-text-finish", path: [0] },
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

const drain = async (readable: ReadableStream<unknown>) => {
  const reader = readable.getReader();
  while (!(await reader.read()).done);
};

describe("assistant-stream: execute-only tool arguments (16-char deltas)", () => {
  for (const size of [1000, 5000, 10000]) {
    const chunks = makeChunks(size, 16);
    bench(`${size} bytes`, async () => {
      await drain(
        chunkSource(chunks).pipeThrough(
          unstable_toolResultStream(
            {
              noop: {
                parameters: { type: "object" },
                execute: () => null,
              },
            },
            new AbortController().signal,
            async () => {},
          ),
        ),
      );
    });
  }
});

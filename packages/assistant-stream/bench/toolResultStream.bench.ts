import { bench, describe } from "vitest";
import { unstable_toolResultStream, type AssistantStreamChunk } from "../src";

const makeChunks = (argumentSize: number, chunkSize: number) => {
  const argsText = JSON.stringify({ code: "x".repeat(argumentSize) });
  const deltas = Array.from(
    { length: Math.ceil(argsText.length / chunkSize) },
    (_, index) => ({
      type: "text-delta" as const,
      path: [0],
      textDelta: argsText.slice(index * chunkSize, (index + 1) * chunkSize),
    }),
  );

  return [
    {
      type: "part-start" as const,
      path: [],
      part: {
        type: "tool-call" as const,
        toolCallId: "bench",
        toolName: "execute-only",
      },
    },
    ...deltas,
    { type: "tool-call-args-text-finish" as const, path: [0] },
    { type: "part-finish" as const, path: [0] },
  ] satisfies AssistantStreamChunk[];
};

const run = async (chunks: AssistantStreamChunk[]) => {
  const input = new ReadableStream<AssistantStreamChunk>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });

  await input
    .pipeThrough(
      unstable_toolResultStream(
        {
          "execute-only": {
            parameters: { type: "object", properties: {} },
            execute: () => "ok",
          },
        },
        new AbortController().signal,
        async () => {},
      ),
    )
    .pipeTo(new WritableStream<AssistantStreamChunk>());
};

describe("assistant-stream: execute-only tool argument streaming (16-char deltas)", () => {
  for (const argumentSize of [1000, 5000, 10000]) {
    const chunks = makeChunks(argumentSize, 16);
    bench(`${argumentSize} argument bytes`, async () => {
      await run(chunks);
    });
  }
});

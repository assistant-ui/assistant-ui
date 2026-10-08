import { describe, inject, test } from "vitest";
import {
  AssistantMessageStream,
  unstable_toolResultStream,
  type AssistantStreamChunk,
} from "assistant-stream";

const makeChunks = (
  argsText: string,
  chunkSize: number,
): AssistantStreamChunk[] => {
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

const drainAccumulator = async (chunks: AssistantStreamChunk[]) => {
  const source = chunkSource(chunks);
  return AssistantMessageStream.fromAssistantStream(source).unstable_result();
};

const drainActiveReader = async (chunks: AssistantStreamChunk[]) => {
  const reads: Promise<unknown>[] = [];
  await drain(
    chunkSource(chunks).pipeThrough(
      unstable_toolResultStream(
        {
          noop: {
            parameters: { type: "object" },
            streamCall: (reader) => {
              reads.push(reader.args.get("value"));
            },
          },
        },
        new AbortController().signal,
        async () => {},
      ),
    ),
  );
  return Promise.all(reads);
};

describe("assistant-stream: execute-only tool arguments (16-char deltas)", () => {
  for (const size of [1000, 5000, 10000]) {
    const chunks = makeChunks(JSON.stringify({ value: "x".repeat(size) }), 16);
    test(`${size} bytes`, async ({ bench }) => {
      await bench(`${size} bytes`, async () => {
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
      }).run(inject("benchSampling"));
    });
  }
});

describe("assistant-stream: accumulator tool arguments (16-char deltas)", () => {
  for (const size of [1000, 5000, 10000]) {
    const chunks = makeChunks(JSON.stringify({ value: "x".repeat(size) }), 16);
    test(`${size} bytes`, async ({ bench }) => {
      const probe = await drainAccumulator(chunks);
      const part = probe.parts[0];
      if (
        part?.type !== "tool-call" ||
        part.argsText.length === 0 ||
        part.args.value !== "x".repeat(size)
      ) {
        throw new Error("Accumulator benchmark did not parse tool arguments");
      }

      await bench(`${size} bytes`, async () => {
        await drainAccumulator(chunks);
      }).run(inject("benchSampling"));
    });
  }
});

describe("assistant-stream: active-reader tool arguments (16-char deltas)", () => {
  for (const size of [1000, 5000, 10000]) {
    const chunks = makeChunks(JSON.stringify({ value: "x".repeat(size) }), 16);
    test(`${size} bytes`, async ({ bench }) => {
      const probe = await drainActiveReader(chunks);
      if (!probe.includes("x".repeat(size))) {
        throw new Error("Active-reader benchmark did not parse tool arguments");
      }
      await bench(`${size} bytes`, async () => {
        await drainActiveReader(chunks);
      }).run(inject("benchSampling"));
    });
  }
});

describe("assistant-stream: complete accumulated arguments (single delta)", () => {
  const argsText = JSON.stringify({
    points: Array.from({ length: 10_000 }, (_, index) => index + 0.5),
  });
  const chunks = makeChunks(argsText, argsText.length);

  test("10,000 array elements", async ({ bench }) => {
    const probe = await drainAccumulator(chunks);
    const part = probe.parts[0];
    if (
      part?.type !== "tool-call" ||
      !Array.isArray(part.args.points) ||
      part.args.points.length !== 10_000 ||
      part.args.points.at(-1) !== 9_999.5
    ) {
      throw new Error("Single-delta benchmark did not parse tool arguments");
    }

    await bench("10,000 array elements", async () => {
      await drainAccumulator(chunks);
    }).run(inject("benchSampling"));
  });
});

describe("assistant-stream: dense accumulated arguments (16-char deltas)", () => {
  for (const [shape, size] of [
    ["array", 2_000],
    ["object", 2_000],
  ] as const) {
    const values = Array.from({ length: size }, (_, index) => index + 0.5);
    const argsText = JSON.stringify(
      shape === "array"
        ? { points: values }
        : Object.fromEntries(
            values.map((value, index) => [`key${index}`, value]),
          ),
    );
    const chunks = makeChunks(argsText, 16);
    test(`${size.toLocaleString("en-US")} ${shape} entries`, async ({
      bench,
    }) => {
      const probe = await drainAccumulator(chunks);
      const part = probe.parts[0];
      if (
        part?.type !== "tool-call" ||
        JSON.stringify(part.args) !== argsText
      ) {
        throw new Error("Dense-delta benchmark did not parse tool arguments");
      }

      await bench(`${size.toLocaleString("en-US")} ${shape} entries`, async () => {
        await drainAccumulator(chunks);
      }).run(inject("benchSampling"));
    });
  }
});

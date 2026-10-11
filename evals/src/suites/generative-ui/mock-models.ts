import { convertArrayToReadableStream, MockLanguageModelV4 } from "ai/test";

type StreamResult = Awaited<ReturnType<MockLanguageModelV4["doStream"]>>;
type StreamPart =
  StreamResult["stream"] extends ReadableStream<infer Part> ? Part : never;

const usage = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
};

const reply = (
  parts: StreamPart[],
  reason: "stop" | "tool-calls",
): StreamResult => ({
  stream: convertArrayToReadableStream<StreamPart>([
    { type: "stream-start", warnings: [] },
    ...parts,
    {
      type: "finish",
      finishReason: { unified: reason, raw: undefined },
      usage,
    },
  ]),
});

let calls = 0;

/** One streamed step that answers in prose. */
export const text = (value: string) =>
  reply(
    [
      { type: "text-start", id: "text" },
      { type: "text-delta", id: "text", delta: value },
      { type: "text-end", id: "text" },
    ],
    "stop",
  );

/** One streamed step that calls `toolName` with `input`. */
export const call = (toolName: string, input: unknown) => {
  const id = `call-${++calls}`;
  return reply(
    [
      { type: "tool-input-start", id, toolName },
      { type: "tool-input-delta", id, delta: JSON.stringify(input) },
      { type: "tool-input-end", id },
      {
        type: "tool-call",
        toolCallId: id,
        toolName,
        input: JSON.stringify(input),
      },
    ],
    "tool-calls",
  );
};

/** A model that streams `steps` in order, one per call. */
export const streamingModel = (...steps: StreamResult[]) =>
  new MockLanguageModelV4({ modelId: "mock-model", doStream: steps });

/** A model whose generated reply is `value`, as a judge returning structured output. */
export const generatingModel = (value: string) =>
  new MockLanguageModelV4({
    modelId: "mock-judge",
    doGenerate: {
      content: [{ type: "text", text: value }],
      finishReason: { unified: "stop", raw: undefined },
      usage,
      warnings: [],
    },
  });

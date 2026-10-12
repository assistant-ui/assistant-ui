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

const textParts = (value: string): StreamPart[] => [
  { type: "text-start", id: "text" },
  { type: "text-delta", id: "text", delta: value },
  { type: "text-end", id: "text" },
];

/** One streamed step that answers in prose. */
export const text = (value: string) => reply(textParts(value), "stop");

const toolCallParts = (toolName: string, input: unknown): StreamPart[] => {
  const id = `call-${++calls}`;
  return [
    { type: "tool-input-start", id, toolName },
    { type: "tool-input-delta", id, delta: JSON.stringify(input) },
    { type: "tool-input-end", id },
    {
      type: "tool-call",
      toolCallId: id,
      toolName,
      input: JSON.stringify(input),
    },
  ];
};

/** One streamed step that calls `toolName` with `input`. */
export const call = (toolName: string, input: unknown) =>
  reply(toolCallParts(toolName, input), "tool-calls");

/** One streamed step that writes `value` as text before calling `toolName` with `input`. */
export const textThenCall = (value: string, toolName: string, input: unknown) =>
  reply([...textParts(value), ...toolCallParts(toolName, input)], "tool-calls");

/** One streamed step that calls `toolName` with `input` and then writes `value` as text. */
export const callThenText = (toolName: string, input: unknown, value: string) =>
  reply([...toolCallParts(toolName, input), ...textParts(value)], "tool-calls");

const malformedCallParts = (toolName: string): StreamPart[] => {
  const id = `call-${++calls}`;
  return [
    { type: "tool-input-start", id, toolName },
    { type: "tool-input-delta", id, delta: "{" },
    { type: "tool-input-end", id },
    { type: "tool-call", toolCallId: id, toolName, input: "{" },
  ];
};

/** One streamed step that calls each of `toolNames` with input that is not JSON, which the SDK rejects before the tool runs. */
export const malformedCall = (...toolNames: string[]) =>
  reply(toolNames.flatMap(malformedCallParts), "tool-calls");

/** One streamed step that writes `value` and then calls `toolName` with input that is not JSON. */
export const textThenMalformedCall = (value: string, toolName: string) =>
  reply([...textParts(value), ...malformedCallParts(toolName)], "tool-calls");

/** One streamed step that calls several tools at once. */
export const parallelCalls = (
  ...entries: [toolName: string, input: unknown][]
) =>
  reply(
    entries.flatMap(([toolName, input]) => toolCallParts(toolName, input)),
    "tool-calls",
  );

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

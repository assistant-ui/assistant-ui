import { generateId, simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import {
  nextStep,
  type ScriptEvent,
  type ScriptStep,
} from "../../../lib/script";

type CallOptions = Parameters<MockLanguageModelV4["doStream"]>[0];
type StreamPart =
  Awaited<
    ReturnType<MockLanguageModelV4["doStream"]>
  >["stream"] extends ReadableStream<infer Part>
    ? Part
    : never;
type ToolOutput = Extract<
  Extract<CallOptions["prompt"][number], { role: "tool" }>["content"][number],
  { type: "tool-result" }
>["output"];

const outputValue = (output: ToolOutput): unknown => {
  switch (output.type) {
    case "json":
    case "text":
      return output.value;
    case "error-json":
    case "error-text":
      return { error: String(output.value) };
    default:
      return undefined;
  }
};

function toHistory(prompt: CallOptions["prompt"]): ScriptEvent[] {
  const history: ScriptEvent[] = [];
  const inputs = new Map<string, unknown>();

  for (const message of prompt) {
    if (message.role === "user") {
      const text = message.content
        .flatMap((part) => (part.type === "text" ? [part.text] : []))
        .join(" ");
      history.push({ type: "user", text });
      continue;
    }
    if (message.role === "system") continue;

    for (const part of message.content) {
      if (part.type === "tool-call") inputs.set(part.toolCallId, part.input);
      if (part.type !== "tool-result") continue;
      history.push({
        type: "tool",
        toolName: part.toolName,
        input: inputs.get(part.toolCallId),
        output: outputValue(part.output),
        ...(part.output.type === "execution-denied" && { denied: true }),
      });
    }
  }

  return history;
}

function toStreamParts({ text, call }: ScriptStep): StreamPart[] {
  const parts: StreamPart[] = [{ type: "stream-start", warnings: [] }];

  if (text) {
    parts.push({ type: "text-start", id: "text" });
    for (const word of text.split(/(?<=\s)/)) {
      parts.push({ type: "text-delta", id: "text", delta: word });
    }
    parts.push({ type: "text-end", id: "text" });
  }

  if (call) {
    parts.push({
      type: "tool-call",
      toolCallId: `call_${generateId()}`,
      toolName: call.toolName,
      input: JSON.stringify(call.input),
    });
  }

  parts.push({
    type: "finish",
    finishReason: { unified: call ? "tool-calls" : "stop", raw: undefined },
    usage: {
      inputTokens: {
        total: undefined,
        noCache: undefined,
        cacheRead: undefined,
        cacheWrite: undefined,
      },
      outputTokens: { total: undefined, text: undefined, reasoning: undefined },
    },
  });

  return parts;
}

/**
 * A model that follows `lib/script.ts` instead of calling a provider, so the
 * example runs without an API key. Everything around it is the real path: the
 * tools execute, the approval gate pauses the run, and the stream is the one
 * `streamText` produces for any model.
 */
export const createScriptedModel = () =>
  new MockLanguageModelV4({
    provider: "example",
    modelId: "scripted-support-desk",
    doStream: async ({ prompt }) => ({
      stream: simulateReadableStream({
        chunks: toStreamParts(nextStep(toHistory(prompt))),
        initialDelayInMs: 300,
        chunkDelayInMs: 25,
      }),
    }),
  });

import type {
  ContentPart,
  Injection,
  InjectionPosition,
  JsonObject,
  JsonValue,
  Transcript,
  Turn,
} from "./types";
import { TRANSCRIPT_VERSION } from "./version";

export type AssistantStreamOptions = {
  chunks?: string[];
  interChunkDelayMs?: number;
  finish?: { reason: "stop" | "abort" | "error" };
};

type InjectNamespace<R> = {
  cancel(): R;
  interrupt(reason?: string): R;
  transportError(options: { code?: number; message: string }): R;
  abortAndRestart(): R;
};

type ReadyBuilder = {
  inject: InjectNamespace<ReadyBuilder>;
  user(content: string | ContentPart[]): ReadyBuilder;
  assistantStream(
    text: string,
    options?: AssistantStreamOptions,
  ): AfterStreamBuilder;
  assistantToolCall(
    name: string,
    args: JsonObject,
    options?: { toolCallId?: string },
  ): OpenToolBuilder;
  metadata(data: JsonObject): ReadyBuilder;
  delayMs(ms: number): ReadyBuilder;
  toJSON(): Transcript;
};

type OpenToolBuilder = {
  toolResult(value: JsonValue): ReadyBuilder;
  toJSON(): Transcript;
};

type AfterStreamInject = InjectNamespace<ReadyBuilder> & {
  disconnect(options: { afterChunk: number }): ReadyBuilder;
};

type AfterStreamBuilder = Omit<ReadyBuilder, "inject"> & {
  inject: AfterStreamInject;
};

const cloneTranscript = (
  turns: Turn[],
  injections: Injection[],
): Transcript => ({
  version: TRANSCRIPT_VERSION,
  turns: [...turns],
  injections: [...injections],
});

function makeBuilder(
  turns: Turn[],
  injections: Injection[],
  nextId: () => string,
): ReadyBuilder {
  const builder = {
    inject: buildInject(turns, injections, nextId),
    user(content: string | ContentPart[]) {
      const parts =
        typeof content === "string"
          ? [{ type: "text" as const, text: content }]
          : content;
      return makeBuilder(
        [...turns, { kind: "user", content: parts }],
        injections,
        nextId,
      );
    },
    assistantStream(text: string, options: AssistantStreamOptions = {}) {
      const chunks = options.chunks ?? [text];
      const joined = chunks.join("");
      if (joined !== text) {
        throw new Error(
          `assistantStream: chunks must concatenate to text. Got chunks="${joined}", text="${text}".`,
        );
      }
      const turn: Turn = {
        kind: "assistantStream",
        text,
        chunks,
        ...(options.interChunkDelayMs !== undefined
          ? { interChunkDelayMs: options.interChunkDelayMs }
          : {}),
        ...(options.finish !== undefined ? { finish: options.finish } : {}),
      };
      const nextTurns = [...turns, turn];
      const ready = makeBuilder(nextTurns, injections, nextId);
      return {
        ...ready,
        inject: buildAfterStreamInject(
          nextTurns,
          injections,
          nextId,
          nextTurns.length - 1,
        ),
      };
    },
    assistantToolCall(
      name: string,
      args: JsonObject,
      options: { toolCallId?: string } = {},
    ) {
      const toolCallId = options.toolCallId ?? nextId();
      return makeOpenToolBuilder(
        [
          ...turns,
          {
            kind: "assistantToolCall",
            toolCallId,
            name,
            args,
            argsText: JSON.stringify(args),
          },
        ],
        injections,
        nextId,
        toolCallId,
      );
    },
    metadata(data: JsonObject) {
      return makeBuilder(
        [...turns, { kind: "metadata", data }],
        injections,
        nextId,
      );
    },
    delayMs(ms: number) {
      if (ms < 0) {
        throw new Error("delayMs requires a non-negative ms value");
      }
      return makeBuilder([...turns, { kind: "delay", ms }], injections, nextId);
    },
    toolResult() {
      throw new Error(
        "toolResult() can only be called immediately after assistantToolCall()",
      );
    },
    toJSON() {
      return cloneTranscript(turns, injections);
    },
  };

  return builder;
}

function makeOpenToolBuilder(
  turns: Turn[],
  injections: Injection[],
  nextId: () => string,
  openToolCallId: string,
): OpenToolBuilder {
  return {
    toolResult(value) {
      return makeBuilder(
        [...turns, { kind: "toolResult", toolCallId: openToolCallId, value }],
        injections,
        nextId,
      );
    },
    toJSON() {
      return cloneTranscript(turns, injections);
    },
  };
}

function buildInject(
  turns: Turn[],
  injections: Injection[],
  nextId: () => string,
): InjectNamespace<ReadyBuilder> {
  const at = (): InjectionPosition => {
    if (turns.length === 0) {
      throw new Error("inject requires at least one turn before it");
    }
    return { turnIndex: turns.length - 1 };
  };

  return {
    cancel: () =>
      makeBuilder(turns, [...injections, { kind: "cancel", at: at() }], nextId),
    interrupt: (reason) =>
      makeBuilder(
        turns,
        [
          ...injections,
          {
            kind: "interrupt",
            at: at(),
            ...(reason !== undefined ? { reason } : {}),
          },
        ],
        nextId,
      ),
    transportError: ({ code, message }) =>
      makeBuilder(
        turns,
        [
          ...injections,
          {
            kind: "transportError",
            at: at(),
            ...(code !== undefined ? { code } : {}),
            message,
          },
        ],
        nextId,
      ),
    abortAndRestart: () =>
      makeBuilder(
        turns,
        [...injections, { kind: "abortAndRestart", at: at() }],
        nextId,
      ),
  };
}

function buildAfterStreamInject(
  turns: Turn[],
  injections: Injection[],
  nextId: () => string,
  streamTurnIndex: number,
): AfterStreamInject {
  const base = buildInject(turns, injections, nextId);
  const stream = turns[streamTurnIndex];
  if (!stream || stream.kind !== "assistantStream") {
    throw new Error(
      "buildAfterStreamInject called without a prior assistantStream",
    );
  }

  return {
    ...base,
    disconnect({ afterChunk }) {
      if (afterChunk < 0 || afterChunk >= stream.chunks.length) {
        throw new Error(
          `disconnect: afterChunk ${afterChunk} is out of range (0..${stream.chunks.length - 1})`,
        );
      }
      return makeBuilder(
        turns,
        [
          ...injections,
          {
            kind: "disconnect",
            at: { turnIndex: streamTurnIndex, afterChunk },
          },
        ],
        nextId,
      );
    },
  };
}

export function transcript(): ReadyBuilder {
  let counter = 0;
  const nextId = () => `tc_${++counter}`;
  return makeBuilder([], [], nextId);
}

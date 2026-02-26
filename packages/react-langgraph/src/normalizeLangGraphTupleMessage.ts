import {
  LangChainMessage,
  LangChainMessageChunk,
  LangChainToolCallChunk,
} from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object";

const normalizeToolCallChunk = (
  value: unknown,
): LangChainToolCallChunk | null => {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.index !== "number"
  ) {
    return null;
  }

  const args =
    typeof value.args === "string"
      ? value.args
      : typeof value.args_json === "string"
        ? value.args_json
        : "";

  return {
    ...(value as LangChainToolCallChunk),
    args,
  };
};

const normalizeLangChainMessageChunk = (
  value: Record<string, unknown>,
): LangChainMessageChunk | null => {
  if (value.type !== "AIMessageChunk" && value.type !== "ai") return null;
  if (value.id !== undefined && typeof value.id !== "string") return null;
  if (
    value.content !== undefined &&
    typeof value.content !== "string" &&
    !Array.isArray(value.content)
  ) {
    return null;
  }
  if (
    value.tool_call_chunks !== undefined &&
    !Array.isArray(value.tool_call_chunks)
  ) {
    return null;
  }

  const normalizedToolCallChunks = value.tool_call_chunks?.flatMap((chunk) => {
    const normalized = normalizeToolCallChunk(chunk);
    return normalized ? [normalized] : [];
  });

  return {
    ...(value as LangChainMessageChunk),
    type: "AIMessageChunk",
    ...(normalizedToolCallChunks && {
      tool_call_chunks: normalizedToolCallChunks,
    }),
  };
};

const isLangChainMessage = (
  value: Record<string, unknown>,
): value is LangChainMessage => {
  return (
    value.type === "system" ||
    value.type === "human" ||
    value.type === "tool" ||
    value.type === "ai"
  );
};

export type NormalizedLangGraphTupleMessage =
  | {
      kind: "chunk";
      message: LangChainMessageChunk;
    }
  | {
      kind: "message";
      message: LangChainMessage;
    };

export const normalizeLangGraphTupleMessage = (
  value: unknown,
): NormalizedLangGraphTupleMessage | null => {
  if (!isRecord(value)) return null;

  const normalizedChunk = normalizeLangChainMessageChunk(value);
  if (normalizedChunk) {
    return {
      kind: "chunk",
      message: normalizedChunk,
    };
  }

  if (isLangChainMessage(value)) {
    return {
      kind: "message",
      message: value,
    };
  }

  return null;
};

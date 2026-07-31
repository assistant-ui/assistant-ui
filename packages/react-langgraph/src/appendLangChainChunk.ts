import type {
  LangChainMessage,
  LangChainMessageChunk,
  LangChainToolCall,
  LangChainToolCallChunk,
  MessageContentText,
} from "./types";
import { parsePartialJsonObject } from "assistant-stream/utils";

type AiMessage = Extract<LangChainMessage, { type: "ai" }>;

const chunkToToolCall = (chunk: LangChainToolCallChunk) => {
  const partialJson = chunk.args ?? chunk.args_json ?? "";
  return {
    ...chunk,
    partial_json: partialJson,
    args: parsePartialJsonObject(partialJson) ?? {},
  };
};

const findMatchingToolCall = (
  prevToolCalls: readonly LangChainToolCall[],
  toolCall: LangChainToolCall,
): LangChainToolCall | undefined => {
  if (toolCall.id != null && toolCall.id !== "") {
    const byId = prevToolCalls.find(
      (p) => p.id != null && p.id !== "" && p.id === toolCall.id,
    );
    if (byId) return byId;
  }
  if (toolCall.index != null) {
    return prevToolCalls.find(
      (p) => p.index === toolCall.index && (!p.id || !toolCall.id),
    );
  }
  return undefined;
};

// The full AIMessage a LangGraph `updates` event delivers on node completion
// carries parsed tool_calls with no partial_json. Carry over the partial_json
// already streamed on matching tool calls so argsText stays a byte-prefix of
// what the tracker already observed, instead of re-stringifying parsed args.
const mergeStreamedToolCallArgs = (
  prev: AiMessage,
  curr: AiMessage,
): AiMessage => {
  const prevToolCalls = prev.tool_calls ?? [];
  const currToolCalls = curr.tool_calls ?? [];
  if (prevToolCalls.length === 0 || currToolCalls.length === 0) return curr;

  let changed = false;
  const mergedToolCalls = currToolCalls.map((toolCall) => {
    if (toolCall.partial_json) return toolCall;
    const streamedPartialJson = findMatchingToolCall(
      prevToolCalls,
      toolCall,
    )?.partial_json;
    if (!streamedPartialJson) return toolCall;
    changed = true;
    return { ...toolCall, partial_json: streamedPartialJson };
  });

  return changed ? { ...curr, tool_calls: mergedToolCalls } : curr;
};

/**
 * Merges an AIMessageChunk into a previous message. Chunks must have
 * `type: "AIMessageChunk"` — JS LangGraph servers send `type: "ai"`,
 * so callers should normalize the type before passing chunks here.
 */
export const appendLangChainChunk = (
  prev: LangChainMessage | undefined,
  curr: LangChainMessage | LangChainMessageChunk,
): LangChainMessage => {
  if (curr.type !== "AIMessageChunk") {
    if (prev?.type === "ai" && curr.type === "ai") {
      return mergeStreamedToolCallArgs(prev, curr);
    }
    return curr;
  }

  if (!prev || prev.type !== "ai") {
    const toolCalls = (curr.tool_call_chunks ?? []).map(chunkToToolCall);
    return {
      ...curr,
      type: curr.type.replace("MessageChunk", "").toLowerCase(),
      tool_call_chunks: undefined,
      ...(toolCalls.length > 0 && { tool_calls: toolCalls }),
    } as LangChainMessage;
  }

  const newContent =
    typeof prev.content === "string"
      ? [{ type: "text" as const, text: prev.content }]
      : [...prev.content];

  if (typeof curr?.content === "string") {
    const lastIndex = newContent.length - 1;
    if (newContent[lastIndex]?.type === "text") {
      (newContent[lastIndex] as MessageContentText).text =
        (newContent[lastIndex] as MessageContentText).text + curr.content;
    } else {
      newContent.push({ type: "text", text: curr.content });
    }
  } else if (Array.isArray(curr.content)) {
    const lastIndex = newContent.length - 1;
    for (const item of curr.content) {
      if (!("type" in item)) {
        continue;
      }

      if (item.type === "text") {
        if (newContent[lastIndex]?.type === "text") {
          (newContent[lastIndex] as MessageContentText).text =
            (newContent[lastIndex] as MessageContentText).text + item.text;
        } else {
          newContent.push({ type: "text", text: item.text });
        }
      } else if (item.type === "image_url") {
        newContent.push(item);
      }
    }
  }

  const newToolCalls = [...(prev.tool_calls ?? [])];
  for (const chunk of curr.tool_call_chunks ?? []) {
    let idx = newToolCalls.findIndex(
      (tc) => tc.id != null && tc.id !== "" && tc.id === chunk.id,
    );
    if (idx === -1 && chunk.index != null) {
      idx = newToolCalls.findIndex(
        (tc) => tc.index === chunk.index && (!tc.id || !chunk.id),
      );
    }
    if (idx === -1) {
      newToolCalls.push(chunkToToolCall(chunk));
    } else {
      const existing = newToolCalls[idx]!;
      const partialJson =
        (existing.partial_json ?? "") + (chunk.args ?? chunk.args_json ?? "");
      newToolCalls[idx] = {
        ...chunk,
        ...existing,
        id: existing.id || chunk.id,
        partial_json: partialJson,
        args:
          parsePartialJsonObject(partialJson) ??
          ("args" in existing ? existing.args : {}),
      };
    }
  }

  return {
    ...prev,
    content: newContent,
    tool_calls: newToolCalls,
  };
};

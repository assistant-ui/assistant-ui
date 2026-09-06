import type {
  LangChainMessage,
  LangChainMessageChunk,
  LangChainToolCall,
  LangChainToolCallChunk,
} from "./types";
import { parsePartialJsonObject } from "assistant-stream/utils";

type AiMessage = Extract<LangChainMessage, { type: "ai" }>;
type AiContentBlock = Exclude<AiMessage["content"], string>[number];

// Mirrors `_mergeLists` in @langchain/core: an indexed block names a slot in the
// accumulated content, so a repeated chunk for that index updates the block
// rather than appending a duplicate.
const findByIndex = (
  content: readonly AiContentBlock[],
  item: AiContentBlock,
): number => {
  const index = "index" in item ? item.index : undefined;
  if (index === undefined) return -1;
  return content.findIndex(
    (part) =>
      part.type === item.type && "index" in part && part.index === index,
  );
};

// The accumulated message stays faithful to the wire, so a block type the
// converter does not render is still kept: only the tool-call representations
// are excluded, because the structured tool_call_chunks own those values.
// Unlike `_mergeDicts` this replaces rather than concatenates a repeated string
// field, which no provider currently splits across chunks on such a block.
// `_mergeDicts` skips a null incoming value and never lets an empty string
// replace an accumulated one, so a continuation chunk that repeats a block's
// keys as placeholders cannot erase what earlier chunks already carried.
const mergeDefined = (
  existing: AiContentBlock,
  item: AiContentBlock,
): AiContentBlock =>
  ({
    ...existing,
    ...Object.fromEntries(
      Object.entries(item).filter(([, value]) => value != null && value !== ""),
    ),
  }) as AiContentBlock;

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
    const { id, tool_call_chunks: _chunks, ...message } = curr;
    prev = {
      ...message,
      ...(id !== undefined && { id }),
      content: [],
      type: "ai",
    };
    if (!Array.isArray(curr.content)) {
      const toolCalls = (curr.tool_call_chunks ?? []).map(chunkToToolCall);
      return {
        ...prev,
        content: curr.content ?? [],
        ...(toolCalls.length > 0 && { tool_calls: toolCalls }),
      };
    }
  }

  const newContent =
    typeof prev.content === "string"
      ? [{ type: "text" as const, text: prev.content }]
      : [...(prev.content ?? [])];

  if (typeof curr?.content === "string") {
    const lastIndex = newContent.length - 1;
    const last = newContent[lastIndex];
    if (last?.type === "text") {
      newContent[lastIndex] = { ...last, text: last.text + curr.content };
    } else {
      newContent.push({ type: "text", text: curr.content });
    }
  } else if (Array.isArray(curr.content)) {
    for (const item of curr.content) {
      if (!("type" in item)) {
        continue;
      }

      const lastIndex = newContent.length - 1;
      if (item.type === "text" || item.type === "text_delta") {
        // `@langchain/anthropic` sends each citation as its own citations_delta:
        // a `text` block carrying only `citations` and no `text` field. Array
        // fields reach `_mergeLists` upstream, which appends rather than
        // replaces, so the citations of one answer accumulate across deltas.
        // `_mergeLists` also drops an unmatched block whose `text` is empty, so a
        // `content_block_start` opener never becomes an empty text part.
        const text = item.text ?? "";
        const normalizedItem = { ...item, type: "text" as const, text };
        const index =
          item.index === undefined
            ? lastIndex
            : findByIndex(newContent, normalizedItem);
        const existing = newContent[index];
        if (existing?.type === "text") {
          const citations = [
            ...(existing.citations ?? []),
            ...(item.citations ?? []),
          ];
          newContent[index] = mergeDefined(existing, {
            ...normalizedItem,
            text: existing.text + text,
            ...(citations.length > 0 && { citations }),
          });
        } else if (item.text !== "") {
          newContent.push(normalizedItem);
        }
      } else if (item.type === "thinking") {
        const index =
          item.index === undefined ? lastIndex : findByIndex(newContent, item);
        const existing = newContent[index];
        if (existing?.type !== "thinking") {
          newContent.push({ ...item, thinking: item.thinking ?? "" });
        } else {
          const thinking = (existing.thinking ?? "") + (item.thinking ?? "");
          const signature = (existing.signature ?? "") + (item.signature ?? "");
          newContent[index] = {
            ...existing,
            ...item,
            ...(thinking && { thinking }),
            ...(signature && { signature }),
          };
        }
      } else if (item.type === "reasoning") {
        const index =
          item.index === undefined ? lastIndex : findByIndex(newContent, item);
        const existing = newContent[index];
        if (existing?.type !== "reasoning") {
          newContent.push(item);
        } else {
          const summary = [...(existing.summary ?? [])];
          for (const [position, part] of (item.summary ?? []).entries()) {
            if (!part) continue;
            const summaryIndex =
              part.index === undefined
                ? position
                : summary.findIndex((s) => s?.index === part.index);
            const previous = summary[summaryIndex];
            if (previous) {
              summary[summaryIndex] = {
                ...previous,
                text: (previous.text ?? "") + (part.text ?? ""),
              };
            } else {
              summary.push(part);
            }
          }
          const reasoning = (existing.reasoning ?? "") + (item.reasoning ?? "");
          const signature = (existing.signature ?? "") + (item.signature ?? "");
          newContent[index] = {
            ...existing,
            ...item,
            ...(reasoning && { reasoning }),
            ...(signature && { signature }),
            ...(summary.length > 0 && { summary }),
          };
        }
      } else if (item.type !== "tool_use" && item.type !== "input_json_delta") {
        const index = findByIndex(newContent, item);
        const existing = newContent[index];
        if (existing) {
          newContent[index] = mergeDefined(existing, item);
        } else {
          newContent.push(item);
        }
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

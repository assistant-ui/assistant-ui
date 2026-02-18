import {
  LangChainMessage,
  LangChainMessageChunk,
  MessageContentText,
} from "./types";
import { parsePartialJsonObject } from "assistant-stream/utils";

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
    return curr;
  }

  if (!prev || prev.type !== "ai") {
    return {
      ...curr,
      type: curr.type.replace("MessageChunk", "").toLowerCase(),
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
    const existing = newToolCalls[chunk.index - 1] ?? { partial_json: "" };
    const partialJson = existing.partial_json + chunk.args;
    newToolCalls[chunk.index - 1] = {
      ...chunk,
      ...existing,
      partial_json: partialJson,
      args:
        parsePartialJsonObject(partialJson) ??
        ("args" in existing ? existing.args : {}),
    };
  }

  return {
    ...prev,
    content: newContent,
    tool_calls: newToolCalls,
  };
};

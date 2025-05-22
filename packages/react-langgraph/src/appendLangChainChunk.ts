import {
  LangChainMessage,
  LangChainMessageChunk,
  MessageContentText,
} from "./types";
import { parsePartialJsonObject } from "assistant-stream/utils";

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

  if (newContent.length === 1 && typeof curr?.content === "string") {
    if (!newContent[0]) {
      newContent[0] = { type: "text", text: "" };
    }
    if ("type" in newContent[0] && newContent[0].type === "text") {
      (newContent[0] as MessageContentText).text =
        (newContent[0] as MessageContentText).text + curr.content;
    }
  } else {
    if (typeof curr.content === "string") {
      const newItem: MessageContentText = {
        type: "text",
        text: curr.content,
      };
      newContent.push(newItem);
    } else {
      newContent.push(...(curr.content ?? []));
    }
  }

  const newToolCalls = [...(prev.tool_calls ?? [])];
  for (const chunk of curr.tool_call_chunks ?? []) {
    const existing = newToolCalls[chunk.index - 1] ?? { argsText: "" };
    const newArgsText = existing.argsText + chunk.args;
    newToolCalls[chunk.index - 1] = {
      ...chunk,
      ...existing,
      argsText: newArgsText,
      args:
        parsePartialJsonObject(newArgsText) ??
        ("args" in existing ? existing.args : {}),
    };
  }

  return {
    ...prev,
    content: newContent,
    tool_calls: newToolCalls,
  };
};

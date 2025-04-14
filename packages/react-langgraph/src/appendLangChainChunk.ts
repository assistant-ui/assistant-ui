import { LangChainMessage, LangChainMessageChunk } from "./types";
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

  for (const chunk of curr.content) {
    if (chunk.type === "text") {
      const existing = newContent[chunk.index] ?? { type: "text", text: "" };
      if (existing.type !== "text") throw new Error("");
      newContent[chunk.index] = {
        ...existing,
        ...chunk,
        text: existing.text + chunk.text,
      };
    }
  }

  const newToolCalls = [...(prev.tool_calls ?? [])];
  for (const chunk of curr.tool_call_chunks) {
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

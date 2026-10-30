// @vitest-environment node

import { expect, it } from "vitest";
import { initializeStreamfold } from "assistant-stream/streamfold";
import { appendLangChainChunk } from "./appendLangChainChunk";
import type { LangChainMessage, LangChainMessageChunk } from "./types";

type AiMessage = Extract<LangChainMessage, { type: "ai" }>;
const append = appendLangChainChunk as (
  previous: AiMessage | undefined,
  chunk: LangChainMessageChunk,
) => AiMessage;
const chunk = (args: string): LangChainMessageChunk => ({
  type: "AIMessageChunk",
  id: "message",
  content: "",
  tool_call_chunks: [{ id: "call", index: 0, name: "write", args }],
});

it("preserves LangGraph tool-call snapshots and branches with Streamfold enabled", async () => {
  expect(await initializeStreamfold()).toBe(true);
  const early = append(undefined, chunk('{"items":[{"text":"hel'));
  const left = append(early, chunk('lo"}]}'));
  const right = append(early, chunk('p"}]}'));
  expect(early.tool_calls?.[0]?.args).toMatchObject({
    items: [{ text: "hel" }],
  });
  expect(left.tool_calls?.[0]?.args).toMatchObject({
    items: [{ text: "hello" }],
  });
  expect(right.tool_calls?.[0]?.args).toMatchObject({
    items: [{ text: "help" }],
  });
});

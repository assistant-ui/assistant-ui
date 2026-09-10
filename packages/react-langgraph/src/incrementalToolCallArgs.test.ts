import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ parsePartialJsonObject: vi.fn() }));

vi.mock("assistant-stream/utils", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("assistant-stream/utils")>();
  mocks.parsePartialJsonObject.mockImplementation(
    original.parsePartialJsonObject,
  );
  return {
    ...original,
    parsePartialJsonObject: mocks.parsePartialJsonObject,
  };
});

import { appendLangChainChunk } from "./appendLangChainChunk";
import { convertLangChainMessages } from "./convertLangChainMessages";
import type { LangChainMessage, LangChainMessageChunk } from "./types";

type AiMessage = Extract<LangChainMessage, { type: "ai" }>;

const append = appendLangChainChunk as (
  previous: AiMessage | undefined,
  chunk: LangChainMessageChunk,
) => AiMessage;

it("does not feed accumulated prefixes back through the full parser", () => {
  const input = JSON.stringify({ text: "x".repeat(2_000) });
  let accumulated: AiMessage | undefined;

  mocks.parsePartialJsonObject.mockClear();
  for (const delta of input.match(/.{1,16}/gs)!) {
    accumulated = append(accumulated, {
      type: "AIMessageChunk",
      id: "ai-1",
      content: "",
      tool_call_chunks: [
        { id: "call-1", index: 0, name: "write", args: delta },
      ],
    });
    convertLangChainMessages(accumulated, {});
  }

  const parsedInputs = mocks.parsePartialJsonObject.mock.calls.map(
    ([value]) => value,
  );
  expect(parsedInputs.every((value) => value === "")).toBe(true);
  expect(accumulated?.tool_calls?.[0]?.args).toMatchObject({
    text: "x".repeat(2_000),
  });
});

it("keeps the full-parser fallback for externally constructed messages", () => {
  const partialJson = '{"query":"pizza';
  mocks.parsePartialJsonObject.mockClear();

  const result = convertLangChainMessages({
    type: "ai",
    id: "ai-1",
    content: "",
    tool_calls: [
      {
        id: "call-1",
        index: 0,
        name: "search",
        args: {},
        partial_json: partialJson,
      },
    ],
  });

  expect(mocks.parsePartialJsonObject).toHaveBeenCalledWith(partialJson);
  expect(
    result.content.find((part) => part.type === "tool-call"),
  ).toMatchObject({
    type: "tool-call",
    args: { query: "pizza" },
    argsText: partialJson,
  });
});

it("keeps incremental state when an updates event replaces the streamed message", () => {
  const partialJson = '{"query":"pizza"}';
  const streamed = append(undefined, {
    type: "AIMessageChunk",
    id: "ai-1",
    content: "",
    tool_call_chunks: [
      {
        id: "call-1",
        index: 0,
        name: "search",
        args: partialJson,
      },
    ],
  });

  mocks.parsePartialJsonObject.mockClear();
  const completed = appendLangChainChunk(streamed, {
    type: "ai",
    id: "ai-1",
    content: "done",
    tool_calls: [
      {
        id: "call-1",
        index: 0,
        name: "search",
        args: { query: "pizza" },
      },
    ],
  });
  convertLangChainMessages(completed, {});

  expect(mocks.parsePartialJsonObject).not.toHaveBeenCalled();
});

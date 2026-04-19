import { describe, it, expect } from "vitest";
import { appendLangChainChunk } from "./appendLangChainChunk";
import type { LangChainMessage, LangChainMessageChunk } from "./types";

const aiChunk = (
  toolCallChunks: LangChainMessageChunk["tool_call_chunks"],
): LangChainMessageChunk => ({
  type: "AIMessageChunk",
  id: "ai-1",
  content: "",
  tool_call_chunks: toolCallChunks,
});

describe("appendLangChainChunk tool_call id merging (regression #3526)", () => {
  it("merges chunk arriving with real id into entry that started with empty id", () => {
    let acc: LangChainMessage | undefined;
    acc = appendLangChainChunk(
      acc,
      aiChunk([{ id: "", index: 0, name: "weather", args_json: '{"city":' }]),
    );
    acc = appendLangChainChunk(
      acc,
      aiChunk([
        {
          id: "real-abc",
          index: 0,
          name: "weather",
          args_json: '"Tokyo"}',
        },
      ]),
    );

    expect(acc.tool_calls).toHaveLength(1);
    expect(acc.tool_calls?.[0]).toMatchObject({
      id: "real-abc",
      index: 0,
      name: "weather",
      partial_json: '{"city":"Tokyo"}',
    });
  });

  it("merges chunk arriving with empty id into entry that started with real id", () => {
    let acc: LangChainMessage | undefined;
    acc = appendLangChainChunk(
      acc,
      aiChunk([
        { id: "real-abc", index: 0, name: "weather", args_json: '{"city":' },
      ]),
    );
    acc = appendLangChainChunk(
      acc,
      aiChunk([{ id: "", index: 0, name: "weather", args_json: '"Tokyo"}' }]),
    );

    expect(acc.tool_calls).toHaveLength(1);
    expect(acc.tool_calls?.[0]).toMatchObject({
      id: "real-abc",
      partial_json: '{"city":"Tokyo"}',
    });
  });

  it("merges two empty-id chunks at the same index", () => {
    let acc: LangChainMessage | undefined;
    acc = appendLangChainChunk(
      acc,
      aiChunk([{ id: "", index: 0, name: "weather", args_json: '{"a":' }]),
    );
    acc = appendLangChainChunk(
      acc,
      aiChunk([{ id: "", index: 0, name: "weather", args_json: "1}" }]),
    );

    expect(acc.tool_calls).toHaveLength(1);
    expect(acc.tool_calls?.[0]).toMatchObject({
      id: "",
      partial_json: '{"a":1}',
    });
  });

  it("does not merge chunks with different real ids at the same index", () => {
    let acc: LangChainMessage | undefined;
    acc = appendLangChainChunk(
      acc,
      aiChunk([{ id: "id-1", index: 0, name: "a", args_json: "{}" }]),
    );
    acc = appendLangChainChunk(
      acc,
      aiChunk([{ id: "id-2", index: 0, name: "b", args_json: "{}" }]),
    );

    expect(acc.tool_calls).toHaveLength(2);
    expect(acc.tool_calls?.map((t) => t.id)).toEqual(["id-1", "id-2"]);
  });

  it("keeps chunks at different indices as separate entries", () => {
    const acc = appendLangChainChunk(
      undefined,
      aiChunk([
        { id: "", index: 0, name: "a", args_json: "{}" },
        { id: "", index: 1, name: "b", args_json: "{}" },
      ]),
    );

    expect(acc.tool_calls).toHaveLength(2);
    expect(acc.tool_calls?.map((t) => t.index)).toEqual([0, 1]);
  });
});

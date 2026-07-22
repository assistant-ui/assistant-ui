import { describe, it, expect } from "vitest";
import { appendLangChainChunk } from "./appendLangChainChunk";
import { convertLangChainMessages } from "./convertLangChainMessages";
import type { LangChainMessage, LangChainMessageChunk } from "./types";

type AiMessage = Extract<LangChainMessage, { type: "ai" }>;

const append = appendLangChainChunk as unknown as (
  prev: AiMessage | undefined,
  curr: LangChainMessageChunk,
) => AiMessage;

const appendAi = appendLangChainChunk as unknown as (
  prev: AiMessage | undefined,
  curr: AiMessage | LangChainMessageChunk,
) => AiMessage;

const convert = convertLangChainMessages as unknown as (
  message: LangChainMessage,
  metadata: Record<string, unknown>,
) => {
  content: ReadonlyArray<{
    type: string;
    argsText?: string;
    toolCallId?: string;
  }>;
};

const toolCallArgsText = (result: ReturnType<typeof convert>): string => {
  const part = result.content.find((p) => p.type === "tool-call");
  if (!part?.argsText) throw new Error("Expected tool-call argsText");
  return part.argsText;
};

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
    let acc: AiMessage | undefined;
    acc = append(
      acc,
      aiChunk([{ id: "", index: 0, name: "weather", args_json: '{"city":' }]),
    );
    acc = append(
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
    let acc: AiMessage | undefined;
    acc = append(
      acc,
      aiChunk([
        { id: "real-abc", index: 0, name: "weather", args_json: '{"city":' },
      ]),
    );
    acc = append(
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
    let acc: AiMessage | undefined;
    acc = append(
      acc,
      aiChunk([{ id: "", index: 0, name: "weather", args_json: '{"a":' }]),
    );
    acc = append(
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
    let acc: AiMessage | undefined;
    acc = append(
      acc,
      aiChunk([{ id: "id-1", index: 0, name: "a", args_json: "{}" }]),
    );
    acc = append(
      acc,
      aiChunk([{ id: "id-2", index: 0, name: "b", args_json: "{}" }]),
    );

    expect(acc.tool_calls).toHaveLength(2);
    expect(acc.tool_calls?.map((t) => t.id)).toEqual(["id-1", "id-2"]);
  });

  it("keeps chunks at different indices as separate entries", () => {
    const acc = append(
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

describe("appendLangChainChunk updates-event partial_json (regression #5098)", () => {
  // Anthropic streams input_json_delta with its own whitespace; the `messages`
  // stream-mode chunks accumulate that text as partial_json. When the node
  // completes, the `updates` event delivers the full AIMessage with parsed
  // tool_calls and no partial_json. The streamed partial_json must be carried
  // forward so the converter does not re-stringify the parsed args into
  // compact JSON that diverges from the streamed text the tracker already
  // observed (which freezes args mid-prefix and throws a parse error).
  const streamed =
    '{"question": "What?", "options": ["a", "b"], "allow_multiple": false}';

  const streamPrefix = (): AiMessage =>
    appendAi(undefined, {
      type: "AIMessageChunk",
      id: "ai-1",
      content: "",
      tool_call_chunks: [
        {
          id: "call-1",
          index: 0,
          name: "ask_question",
          args_json: '{"question": "What?", "options":',
        },
      ],
    });

  const streamTail = (acc: AiMessage): AiMessage =>
    appendAi(acc, {
      type: "AIMessageChunk",
      id: "ai-1",
      content: "",
      tool_call_chunks: [
        {
          id: "call-1",
          index: 0,
          name: "ask_question",
          args_json: ' ["a", "b"], "allow_multiple": false}',
        },
      ],
    });

  const fullAiMessage = (): AiMessage => ({
    type: "ai",
    id: "ai-1",
    content: "",
    tool_calls: [
      {
        id: "call-1",
        index: 0,
        name: "ask_question",
        args: {
          question: "What?",
          options: ["a", "b"],
          allow_multiple: false,
        },
      },
    ],
  });

  it("carries streamed partial_json onto the full AIMessage that replaces the chunk sequence", () => {
    const acc = streamTail(streamPrefix());
    expect(acc.tool_calls?.[0]?.partial_json).toBe(streamed);

    const final = appendAi(acc, fullAiMessage());
    expect(final.type).toBe("ai");
    expect(final.tool_calls?.[0]?.partial_json).toBe(streamed);
  });

  it("final argsText stays a byte-extension of the streamed prefix after the updates event", () => {
    const metadata = {
      toolArgsKeyOrderCache: new Map<string, Map<string, string[]>>(),
    };

    const prefixArgsText = toolCallArgsText(convert(streamPrefix(), metadata));

    const final = appendAi(streamTail(streamPrefix()), fullAiMessage());
    const finalArgsText = toolCallArgsText(convert(final, metadata));

    expect(finalArgsText).toBe(streamed);
    expect(finalArgsText.startsWith(prefixArgsText)).toBe(true);
  });

  it("does not synthesize partial_json when the prior message has none to carry", () => {
    const final = appendAi(
      {
        type: "ai",
        id: "ai-1",
        content: "",
        tool_calls: [
          { id: "call-1", index: 0, name: "ask_question", args: { q: "x" } },
        ],
      },
      {
        type: "ai",
        id: "ai-1",
        content: "",
        tool_calls: [
          { id: "call-1", index: 0, name: "ask_question", args: { q: "x" } },
        ],
      },
    );

    expect(final.tool_calls?.[0]?.partial_json).toBeUndefined();
  });

  it("keeps the updates event's own partial_json when present", () => {
    const final = appendAi(
      {
        type: "ai",
        id: "ai-1",
        content: "",
        tool_calls: [
          {
            id: "call-1",
            index: 0,
            name: "ask_question",
            args: { q: "x" },
            partial_json: '{"q":"prev"}',
          },
        ],
      },
      {
        type: "ai",
        id: "ai-1",
        content: "",
        tool_calls: [
          {
            id: "call-1",
            index: 0,
            name: "ask_question",
            args: { q: "x" },
            partial_json: '{"q": "x"}',
          },
        ],
      },
    );

    expect(final.tool_calls?.[0]?.partial_json).toBe('{"q": "x"}');
  });

  it("matches tool calls by index when the updates event carries an empty id", () => {
    const acc = appendAi(undefined, {
      type: "AIMessageChunk",
      id: "ai-1",
      content: "",
      tool_call_chunks: [
        { id: "", index: 0, name: "ask_question", args_json: '{"q": "x"}' },
      ],
    });
    const final = appendAi(acc, {
      type: "ai",
      id: "ai-1",
      content: "",
      tool_calls: [
        { id: "", index: 0, name: "ask_question", args: { q: "x" } },
      ],
    });

    expect(final.tool_calls?.[0]?.partial_json).toBe('{"q": "x"}');
  });

  it("returns a non-ai message unchanged", () => {
    const toolMessage: LangChainMessage = {
      type: "tool",
      id: "t-1",
      content: "r",
      tool_call_id: "call-1",
      name: "ask_question",
      status: "success",
    };
    const final = appendLangChainChunk(
      {
        type: "ai",
        id: "ai-1",
        content: "",
        tool_calls: [
          {
            id: "call-1",
            index: 0,
            name: "ask_question",
            args: {},
            partial_json: '{"q":1}',
          },
        ],
      },
      toolMessage,
    );
    expect(final).toBe(toolMessage);
  });
});

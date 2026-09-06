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

describe("appendLangChainChunk content-less chunks", () => {
  it("accumulates text after a tool-call-only first chunk", () => {
    const first = append(undefined, {
      type: "AIMessageChunk",
      id: "ai-1",
      tool_call_chunks: [
        { id: "call-1", name: "search", args: "{}", index: 0 },
      ],
    } as unknown as LangChainMessageChunk);

    const merged = append(first, {
      type: "AIMessageChunk",
      id: "ai-1",
      content: "hello",
    } as unknown as LangChainMessageChunk);

    expect(first.content).toEqual([]);

    expect(merged.content).toEqual([{ type: "text", text: "hello" }]);
    expect(merged.tool_calls).toEqual([
      expect.objectContaining({ id: "call-1", name: "search" }),
    ]);
  });
});

describe("appendLangChainChunk continuation content", () => {
  it("keeps reasoning, files, audio, computer calls, and text deltas for conversion", () => {
    const first = appendLangChainChunk(undefined, {
      id: "ai-1",
      type: "AIMessageChunk",
      content: [],
    });
    const merged = appendLangChainChunk(first, {
      id: "ai-1",
      type: "AIMessageChunk",
      content: [
        { type: "thinking", thinking: "Let me check." },
        { type: "reasoning", reasoning: "The calculation is correct." },
        {
          type: "file",
          source_type: "url",
          url: "https://example.com/report.pdf",
          mime_type: "application/pdf",
        },
        {
          type: "audio",
          data: "YXVkaW8=",
          mime_type: "audio/wav",
          source_type: "base64",
        },
        {
          type: "computer_call",
          id: "computer-1",
          call_id: "call-1",
          action: { type: "screenshot" },
          pending_safety_checks: [],
          index: 0,
        },
        { type: "tool_use" },
        { type: "input_json_delta" },
        { type: "text_delta", text: "Done." },
      ],
    });

    expect(convertLangChainMessages(merged, {})).toHaveProperty("content", [
      { type: "reasoning", text: "Let me check." },
      { type: "reasoning", text: "The calculation is correct." },
      {
        type: "file",
        filename: "file",
        data: "https://example.com/report.pdf",
        mimeType: "application/pdf",
        sourceType: "url",
      },
      {
        type: "file",
        filename: "audio.wav",
        data: "YXVkaW8=",
        mimeType: "audio/wav",
      },
      {
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "computer_call",
        args: { type: "screenshot" },
        argsText: '{"type":"screenshot"}',
      },
      { type: "text", text: "Done." },
    ]);
    expect(merged.content).not.toContainEqual({ type: "tool_use" });
    expect(merged.content).not.toContainEqual({ type: "input_json_delta" });
  });

  it("merges a text delta into the preceding text", () => {
    const merged = appendLangChainChunk(
      { id: "ai-1", type: "ai", content: "Hello" },
      {
        id: "ai-1",
        type: "AIMessageChunk",
        content: [{ type: "text_delta", text: " world" }],
      },
    );

    expect(merged.content).toEqual([{ type: "text", text: "Hello world" }]);
  });

  it("merges a citation-only delta into the preceding text", () => {
    const first = append(undefined, {
      type: "AIMessageChunk",
      id: "ai-1",
      content: [{ index: 0, type: "text", text: "Paris" }],
    } as unknown as LangChainMessageChunk);

    const merged = append(first, {
      type: "AIMessageChunk",
      id: "ai-1",
      content: [
        {
          index: 0,
          type: "text",
          citations: [{ type: "char_location", cited_text: "Paris" }],
        },
      ],
    } as unknown as LangChainMessageChunk);

    expect(merged.content).toEqual([
      {
        index: 0,
        type: "text",
        text: "Paris",
        citations: [{ type: "char_location", cited_text: "Paris" }],
      },
    ]);
    expect(convertLangChainMessages(merged, {})).toHaveProperty("content", [
      { type: "text", text: "Paris" },
    ]);
  });

  it("accumulates one citation per delta across a cited answer", () => {
    const first = { type: "char_location", cited_text: "Paris" };
    const second = { type: "char_location", cited_text: "France" };
    const chunk = (content: unknown) =>
      ({
        type: "AIMessageChunk",
        id: "ai-1",
        content,
      }) as unknown as LangChainMessageChunk;

    let merged = append(
      undefined,
      chunk([{ index: 0, type: "text_delta", text: "Paris" }]),
    );
    merged = append(
      merged,
      chunk([{ index: 0, type: "text", citations: [first] }]),
    );
    merged = append(
      merged,
      chunk([{ index: 0, type: "text_delta", text: " is in France" }]),
    );
    merged = append(
      merged,
      chunk([{ index: 0, type: "text", citations: [second] }]),
    );

    expect(merged.content).toEqual([
      {
        index: 0,
        type: "text",
        text: "Paris is in France",
        citations: [first, second],
      },
    ]);
  });

  it("merges a citation-only text_delta into the preceding text", () => {
    const first = append(undefined, {
      type: "AIMessageChunk",
      id: "ai-1",
      content: [{ index: 0, type: "text_delta", text: "Paris" }],
    } as unknown as LangChainMessageChunk);

    const merged = append(first, {
      type: "AIMessageChunk",
      id: "ai-1",
      content: [
        {
          index: 0,
          type: "text_delta",
          citations: [{ type: "char_location", cited_text: "Paris" }],
        },
      ],
    } as unknown as LangChainMessageChunk);

    expect(merged.content).toEqual([
      {
        index: 0,
        type: "text",
        text: "Paris",
        citations: [{ type: "char_location", cited_text: "Paris" }],
      },
    ]);
  });

  it("opens a text block for a citation-only delta with no text to merge into", () => {
    const merged = append(undefined, {
      type: "AIMessageChunk",
      id: "ai-1",
      content: [
        {
          index: 0,
          type: "text",
          citations: [{ type: "char_location", cited_text: "Paris" }],
        },
        { index: 0, type: "text", text: "Paris" },
      ],
    } as unknown as LangChainMessageChunk);

    expect(merged.content).toEqual([
      {
        index: 0,
        type: "text",
        text: "Paris",
        citations: [{ type: "char_location", cited_text: "Paris" }],
      },
    ]);
    expect(convertLangChainMessages(merged, {})).toHaveProperty("content", [
      { type: "text", text: "Paris" },
    ]);
  });

  it("keeps text after intervening content and joins adjacent text deltas", () => {
    const merged = appendLangChainChunk(
      { id: "ai-1", type: "ai", content: [{ type: "text", text: "Hello" }] },
      {
        id: "ai-1",
        type: "AIMessageChunk",
        content: [
          { type: "thinking", thinking: "Checking." },
          { type: "text", text: "After thinking." },
          {
            type: "file",
            source_type: "url",
            url: "https://example.com/report.pdf",
          },
          { type: "text_delta", text: "Done" },
          { type: "text_delta", text: "." },
        ],
      },
    );

    expect(convertLangChainMessages(merged, {})).toHaveProperty("content", [
      { type: "text", text: "Hello" },
      { type: "reasoning", text: "Checking." },
      { type: "text", text: "After thinking." },
      {
        type: "file",
        filename: "file",
        data: "https://example.com/report.pdf",
        mimeType: "application/octet-stream",
        sourceType: "url",
      },
      { type: "text", text: "Done." },
    ]);
  });

  it("keeps indexed text blocks separate", () => {
    let merged = append(undefined, {
      id: "ai-1",
      type: "AIMessageChunk",
      content: [{ index: 0, type: "text", text: "A" }],
    } as unknown as LangChainMessageChunk);
    merged = append(merged, {
      id: "ai-1",
      type: "AIMessageChunk",
      content: [{ index: 1, type: "text_delta", text: "B" }],
    } as unknown as LangChainMessageChunk);

    expect(merged.content).toEqual([
      { index: 0, type: "text", text: "A" },
      { index: 1, type: "text", text: "B" },
    ]);
  });

  it("skips an empty opener with no block to merge into", () => {
    let merged = append(undefined, {
      id: "ai-1",
      type: "AIMessageChunk",
      content: [{ index: 0, type: "text", text: "Hi" }],
    } as unknown as LangChainMessageChunk);
    merged = append(merged, {
      id: "ai-1",
      type: "AIMessageChunk",
      content: [{ index: 1, type: "text", text: "" }],
    } as unknown as LangChainMessageChunk);
    merged = append(merged, {
      id: "ai-1",
      type: "AIMessageChunk",
      content: [{ index: 1, type: "text_delta", text: "There" }],
    } as unknown as LangChainMessageChunk);

    expect(merged.content).toEqual([
      { index: 0, type: "text", text: "Hi" },
      { index: 1, type: "text", text: "There" },
    ]);
  });

  it("merges an indexed citation into its matching text block", () => {
    let merged = append(undefined, {
      id: "ai-1",
      type: "AIMessageChunk",
      content: [{ index: 0, type: "text", text: "A" }],
    } as unknown as LangChainMessageChunk);
    merged = append(merged, {
      id: "ai-1",
      type: "AIMessageChunk",
      content: [
        { index: 1, type: "thinking", thinking: "Thinking" },
        { index: 2, type: "text", text: "B" },
      ],
    });
    merged = append(merged, {
      id: "ai-1",
      type: "AIMessageChunk",
      content: [
        {
          index: 0,
          type: "text",
          citations: [{ type: "char_location", cited_text: "A" }],
        },
      ],
    } as unknown as LangChainMessageChunk);

    expect(merged.content).toEqual([
      {
        index: 0,
        type: "text",
        text: "A",
        citations: [{ type: "char_location", cited_text: "A" }],
      },
      { index: 1, type: "thinking", thinking: "Thinking" },
      { index: 2, type: "text", text: "B" },
    ]);
  });

  it("accumulates thinking by block index without changing earlier messages", () => {
    const first = appendLangChainChunk(undefined, {
      id: "ai-1",
      type: "AIMessageChunk",
      content: [{ type: "thinking", thinking: "Let", index: 0 }],
    });
    const merged = appendLangChainChunk(first, {
      id: "ai-1",
      type: "AIMessageChunk",
      content: [
        { type: "thinking", thinking: "Other.", index: 1 },
        { type: "thinking", thinking: " me check.", index: 0 },
      ],
    });
    expect(convertLangChainMessages(first, {})).toHaveProperty("content", [
      { type: "reasoning", text: "Let" },
    ]);
    expect(convertLangChainMessages(merged, {})).toHaveProperty("content", [
      { type: "reasoning", text: "Let me check." },
      { type: "reasoning", text: "Other." },
    ]);
  });

  it("accumulates thinking signature fragments without rendering an empty part", () => {
    const signatureChunk = (signature: string) =>
      JSON.parse(
        `{"id":"ai-1","type":"AIMessageChunk","content":[{"type":"thinking","signature":"${signature}","index":0}]}`,
      );
    const first = appendLangChainChunk(undefined, signatureChunk("sig-"));
    expect(convertLangChainMessages(first, {})).toHaveProperty("content", []);
    const thinking = appendLangChainChunk(first, {
      id: "ai-1",
      type: "AIMessageChunk",
      content: [{ type: "thinking", thinking: "Checking.", index: 0 }],
    });
    const merged = appendLangChainChunk(thinking, signatureChunk("part2"));
    expect(merged.content).toEqual([
      expect.objectContaining({
        index: 0,
        thinking: "Checking.",
        signature: "sig-part2",
      }),
    ]);
    expect(convertLangChainMessages(merged, {})).toHaveProperty("content", [
      { type: "reasoning", text: "Checking." },
    ]);
  });

  it("merges a repeated indexed block instead of appending a duplicate", () => {
    const call = (action: Record<string, unknown>) =>
      ({
        type: "computer_call",
        id: "computer-1",
        call_id: "call-1",
        action,
        pending_safety_checks: [],
        index: 0,
      }) satisfies Exclude<
        LangChainMessageChunk["content"],
        string | undefined
      >[number];
    const first = appendLangChainChunk(undefined, {
      id: "ai-1",
      type: "AIMessageChunk",
      content: [call({ type: "screenshot" })],
    });
    const merged = appendLangChainChunk(first, {
      id: "ai-1",
      type: "AIMessageChunk",
      content: [call({ type: "click", x: 1, y: 2 })],
    });

    expect(convertLangChainMessages(merged, {})).toHaveProperty("content", [
      {
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "computer_call",
        args: { type: "click", x: 1, y: 2 },
        argsText: '{"type":"click","x":1,"y":2}',
      },
    ]);

    const placeholders = appendLangChainChunk(
      merged,
      JSON.parse(
        '{"id":"ai-1","type":"AIMessageChunk","content":[{"type":"computer_call","index":0,"call_id":"","id":null,"action":null,"status":"completed"}]}',
      ),
    );
    expect(placeholders.content).toEqual([
      expect.objectContaining({
        call_id: "call-1",
        id: "computer-1",
        action: { type: "click", x: 1, y: 2 },
        status: "completed",
      }),
    ]);
  });

  it("joins reasoning summary deltas by summary index", () => {
    let merged: LangChainMessage = { id: "ai-1", type: "ai", content: [] };
    const blocks = [
      { type: "reasoning", index: 0, summary: [] },
      {
        type: "reasoning",
        index: 0,
        summary: [{ type: "summary_text", index: 0, text: "First" }],
      },
      {
        type: "reasoning",
        index: 0,
        summary: [{ type: "summary_text", index: 1, text: "Second" }],
      },
      {
        type: "reasoning",
        index: 0,
        summary: [{ type: "summary_text", index: 0, text: " step." }],
      },
      {
        type: "reasoning",
        index: 0,
        summary: [{ type: "summary_text", index: 1, text: " step." }],
      },
      { type: "reasoning", index: 1, reasoning: "Separate." },
    ] satisfies Exclude<LangChainMessageChunk["content"], string | undefined>;
    for (const block of blocks) {
      merged = appendLangChainChunk(merged, {
        id: "ai-1",
        type: "AIMessageChunk",
        content: [block],
      });
    }
    expect(convertLangChainMessages(merged, {})).toHaveProperty("content", [
      { type: "reasoning", text: "First step.\n\n\nSecond step." },
      { type: "reasoning", text: "Separate." },
    ]);
  });

  it.each([{ index: 0 }, {}])(
    "falls back to the reasoning string until the summary carries text, with %j",
    (block) => {
      const first = appendLangChainChunk(undefined, {
        id: "ai-1",
        type: "AIMessageChunk",
        content: [
          { type: "reasoning", reasoning: "partial thinking", ...block },
        ],
      });
      const blank = appendLangChainChunk(first, {
        id: "ai-1",
        type: "AIMessageChunk",
        content: [
          {
            type: "reasoning",
            ...block,
            summary: [{ type: "summary_text", index: 0 }],
          },
        ],
      });
      const summary = appendLangChainChunk(blank, {
        id: "ai-1",
        type: "AIMessageChunk",
        content: [
          {
            type: "reasoning",
            ...block,
            summary: [{ type: "summary_text", index: 0, text: "first" }],
          },
        ],
      });
      const merged = appendLangChainChunk(summary, {
        id: "ai-1",
        type: "AIMessageChunk",
        content: [
          {
            type: "reasoning",
            ...block,
            summary: [
              { type: "summary_text", index: 0, text: " summary" },
              { type: "summary_text", index: 1, text: "second summary" },
            ],
          },
        ],
      });

      expect(convertLangChainMessages(first, {})).toHaveProperty("content", [
        { type: "reasoning", text: "partial thinking" },
      ]);
      expect(convertLangChainMessages(blank, {})).toHaveProperty("content", [
        { type: "reasoning", text: "partial thinking" },
      ]);
      expect(convertLangChainMessages(summary, {})).toHaveProperty("content", [
        { type: "reasoning", text: "first" },
      ]);
      expect(convertLangChainMessages(merged, {})).toHaveProperty("content", [
        { type: "reasoning", text: "first summary\n\n\nsecond summary" },
      ]);
      expect(merged.content).toEqual([
        expect.objectContaining({ reasoning: "partial thinking" }),
      ]);
    },
  );

  it("keeps reasoning signatures without empty parts or cross-index text", () => {
    const signature = {
      type: "reasoning" as const,
      signature: "sig-",
      index: 0,
    };
    const first = appendLangChainChunk(undefined, {
      id: "ai-1",
      type: "AIMessageChunk",
      content: [signature],
    });
    expect(convertLangChainMessages(first, {})).toHaveProperty("content", []);

    const sibling = appendLangChainChunk(first, {
      id: "ai-1",
      type: "AIMessageChunk",
      content: [
        { type: "reasoning", index: 1, reasoning: "Separate." },
        {
          type: "reasoning",
          index: 0,
          summary: [{ type: "summary_text", index: 0 }],
        },
      ],
    });
    expect(convertLangChainMessages(sibling, {})).toHaveProperty("content", [
      { type: "reasoning", text: "Separate." },
    ]);

    const text = appendLangChainChunk(sibling, {
      id: "ai-1",
      type: "AIMessageChunk",
      content: [{ type: "reasoning", index: 0, reasoning: "Checking." }],
    });
    expect(text.content).toEqual([
      expect.objectContaining({
        index: 0,
        signature: "sig-",
        reasoning: "Checking.",
      }),
      expect.objectContaining({ index: 1, reasoning: "Separate." }),
    ]);

    const signed = appendLangChainChunk(text, {
      id: "ai-1",
      type: "AIMessageChunk",
      content: [{ ...signature, signature: "part2" }],
    });
    expect(signed.content).toEqual([
      expect.objectContaining({
        index: 0,
        signature: "sig-part2",
        reasoning: "Checking.",
      }),
      expect.objectContaining({ index: 1, reasoning: "Separate." }),
    ]);
    expect(convertLangChainMessages(signed, {})).toHaveProperty("content", [
      { type: "reasoning", text: "Checking." },
      { type: "reasoning", text: "Separate." },
    ]);
    expect(convertLangChainMessages(first, {})).toHaveProperty("content", []);
  });

  it("joins unindexed reasoning deltas only while they are adjacent", () => {
    let merged = appendLangChainChunk(undefined, {
      id: "ai-1",
      type: "AIMessageChunk",
      content: [{ type: "reasoning", reasoning: "One" }],
    });
    merged = appendLangChainChunk(merged, {
      id: "ai-1",
      type: "AIMessageChunk",
      content: [
        { type: "reasoning", reasoning: " step." },
        { type: "text_delta", text: "Answer." },
        { type: "reasoning", reasoning: "Two" },
        { type: "reasoning", reasoning: " steps." },
      ],
    });
    expect(convertLangChainMessages(merged, {})).toHaveProperty("content", [
      { type: "reasoning", text: "One step." },
      { type: "text", text: "Answer." },
      { type: "reasoning", text: "Two steps." },
    ]);
  });
});

describe("appendLangChainChunk tool_call id merging", () => {
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

describe("appendLangChainChunk updates-event partial_json", () => {
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

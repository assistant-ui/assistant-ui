import { describe, it, expect } from "vitest";
import type { AppendMessage } from "@assistant-ui/core";
import {
  convertLangChainMessages as convertLangChainMessagesImpl,
  getMessageContent,
} from "./convertLangChainMessages";
import type { LangChainMessage, UIMessage } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConvertResult = {
  role: string;
  id?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: ReadonlyArray<any>;
  metadata?: { custom?: Record<string, unknown> };
};

const convertLangChainMessages = (
  message: LangChainMessage,
  metadata: Record<string, unknown> = {},
): ConvertResult =>
  (
    convertLangChainMessagesImpl as unknown as (
      message: LangChainMessage,
      metadata: Record<string, unknown>,
    ) => ConvertResult
  )(message, metadata);

describe("convertLangChainMessages metadata", () => {
  it("passes additional_kwargs.metadata to system message", () => {
    const result = convertLangChainMessages({
      type: "system",
      id: "sys-1",
      content: "You are a helpful assistant.",
      additional_kwargs: {
        metadata: { speaker_name: "System" },
      },
    });

    expect(result).toMatchObject({
      role: "system",
      metadata: { custom: { speaker_name: "System" } },
    });
  });

  it("passes additional_kwargs.metadata to human message", () => {
    const result = convertLangChainMessages({
      type: "human",
      id: "human-1",
      content: "Hello!",
      additional_kwargs: {
        metadata: { speaker_name: "Presenter" },
      },
    });

    expect(result).toMatchObject({
      role: "user",
      metadata: { custom: { speaker_name: "Presenter" } },
    });
  });

  it("passes additional_kwargs.metadata to ai message", () => {
    const result = convertLangChainMessages({
      type: "ai",
      id: "ai-1",
      content: "Hi there!",
      additional_kwargs: {
        metadata: { model: "gpt-5.4-nano", speaker_name: "Assistant" },
      },
    });

    expect(result).toMatchObject({
      role: "assistant",
      metadata: {
        custom: { model: "gpt-5.4-nano", speaker_name: "Assistant" },
      },
    });
  });

  it("defaults to empty metadata when additional_kwargs.metadata is absent", () => {
    const system = convertLangChainMessages({
      type: "system",
      id: "sys-1",
      content: "Hello",
    });
    expect(system).toMatchObject({
      metadata: { custom: {} },
    });

    const human = convertLangChainMessages({
      type: "human",
      id: "human-1",
      content: "Hello",
    });
    expect(human).toMatchObject({
      metadata: { custom: {} },
    });

    const ai = convertLangChainMessages({
      type: "ai",
      id: "ai-1",
      content: "Hello",
    });
    expect(ai).toMatchObject({
      metadata: { custom: {} },
    });
  });

  it("defaults to empty metadata when additional_kwargs exists but has no metadata", () => {
    const ai = convertLangChainMessages({
      type: "ai",
      id: "ai-1",
      content: "Hello",
      additional_kwargs: {},
    });
    expect(ai).toMatchObject({
      metadata: { custom: {} },
    });
  });

  it("uses args_json fallback for tool call args text", () => {
    const result = convertLangChainMessages({
      type: "ai",
      id: "ai-1",
      content: "",
      tool_calls: [
        {
          id: "tool-1",
          name: "fetch_page_content",
          args: {},
        },
      ],
      tool_call_chunks: [
        {
          id: "tool-1",
          index: 1,
          name: "fetch_page_content",
          args_json: '{"url":"https://example.com"}',
        },
      ],
    });

    if (!("content" in result)) {
      throw new Error("Expected assistant message content");
    }
    const toolCallPart = result.content.find(
      (part) => part.type === "tool-call",
    );
    expect(toolCallPart).toMatchObject({
      type: "tool-call",
      toolCallId: "tool-1",
      toolName: "fetch_page_content",
      args: { url: "https://example.com" },
      argsText: '{"url":"https://example.com"}',
    });
  });

  it("keeps Bedrock tool args prefix-monotonic when the first chunk has no args", () => {
    const firstResult = convertLangChainMessages({
      type: "ai",
      id: "ai-1",
      content: "",
      tool_calls: [
        {
          id: "tool-1",
          name: "fetch_page_content",
          args: {},
          index: 0,
        },
      ],
      tool_call_chunks: [
        {
          id: "tool-1",
          index: 0,
          name: "fetch_page_content",
        },
      ],
    });

    const nextResult = convertLangChainMessages({
      type: "ai",
      id: "ai-1",
      content: "",
      tool_calls: [
        {
          id: "tool-1",
          name: "fetch_page_content",
          args: {},
          index: 0,
        },
      ],
      tool_call_chunks: [
        {
          id: "tool-1",
          index: 0,
          name: "fetch_page_content",
          args: '{"url":',
        },
      ],
    });

    const firstToolCallPart = firstResult.content.find(
      (part) => part.type === "tool-call",
    );
    const nextToolCallPart = nextResult.content.find(
      (part) => part.type === "tool-call",
    );

    expect(firstToolCallPart).toMatchObject({ argsText: "" });
    expect(nextToolCallPart).toMatchObject({ argsText: '{"url":' });
  });

  it("keeps key order from partial_json when final snapshot falls back to args", () => {
    const metadata = {
      toolArgsKeyOrderCache: new Map<string, Map<string, string[]>>(),
    };

    const streamingResult = convertLangChainMessages(
      {
        type: "ai",
        id: "ai-1",
        content: "",
        tool_calls: [
          {
            id: "tool-1",
            name: "fetch_page_content",
            args: {
              filters: { region: "us", sector: "tech" },
              limit: 5,
              type: "high_stock_model",
            },
            partial_json:
              '{"type":"high_stock_model","limit":5,' +
              '"filters":{"region":"us","sector":"tech"}',
          },
        ],
      },
      metadata,
    );

    if (!("content" in streamingResult)) {
      throw new Error("Expected assistant message content");
    }

    const streamingToolCallPart = streamingResult.content.find(
      (part) => part.type === "tool-call",
    );

    expect(streamingToolCallPart).toMatchObject({
      argsText:
        '{"type":"high_stock_model","limit":5,' +
        '"filters":{"region":"us","sector":"tech"}',
    });

    const finalResult = convertLangChainMessages(
      {
        type: "ai",
        id: "ai-1",
        content: "",
        tool_calls: [
          {
            id: "tool-1",
            name: "fetch_page_content",
            args: {
              filters: { sector: "tech", region: "us" },
              limit: 5,
              type: "high_stock_model",
            },
          },
        ],
      },
      metadata,
    );

    if (!("content" in finalResult)) {
      throw new Error("Expected assistant message content");
    }

    const finalToolCallPart = finalResult.content.find(
      (part) => part.type === "tool-call",
    );

    expect(finalToolCallPart).toMatchObject({
      argsText:
        '{"type":"high_stock_model","limit":5,' +
        '"filters":{"region":"us","sector":"tech"}}',
    });
  });

  it("stabilizes computer_call args key order across snapshots", () => {
    const metadata = {
      toolArgsKeyOrderCache: new Map<string, Map<string, string[]>>(),
    };

    const firstResult = convertLangChainMessages(
      {
        type: "ai",
        id: "ai-1",
        content: [
          {
            type: "computer_call",
            call_id: "call-1",
            id: "computer-1",
            action: {
              kind: "click",
              target: { x: 10, y: 20 },
            },
            pending_safety_checks: [],
            index: 0,
          },
        ],
      },
      metadata,
    );

    if (!("content" in firstResult)) {
      throw new Error("Expected assistant message content");
    }

    const firstToolCallPart = firstResult.content.find(
      (part) => part.type === "tool-call",
    );

    expect(firstToolCallPart).toMatchObject({
      argsText: '{"kind":"click","target":{"x":10,"y":20}}',
    });

    const secondResult = convertLangChainMessages(
      {
        type: "ai",
        id: "ai-1",
        content: [
          {
            type: "computer_call",
            call_id: "call-1",
            id: "computer-1",
            action: {
              target: { y: 20, x: 10 },
              kind: "click",
            },
            pending_safety_checks: [],
            index: 0,
          },
        ],
      },
      metadata,
    );

    if (!("content" in secondResult)) {
      throw new Error("Expected assistant message content");
    }

    const secondToolCallPart = secondResult.content.find(
      (part) => part.type === "tool-call",
    );

    expect(secondToolCallPart).toMatchObject({
      argsText: '{"kind":"click","target":{"x":10,"y":20}}',
    });
  });
});

describe("convertLangChainMessages file content", () => {
  it("converts flat base64-style file content blocks", () => {
    const result = convertLangChainMessages({
      type: "human",
      id: "human-flat-file",
      content: [
        {
          type: "file",
          data: "ZmxhdA==",
          mime_type: "application/pdf",
          source_type: "base64",
          metadata: {
            filename: "flat.pdf",
          },
        },
      ],
    });

    expect(result).toMatchObject({
      role: "user",
      content: [
        {
          type: "file",
          filename: "flat.pdf",
          data: "ZmxhdA==",
          mimeType: "application/pdf",
        },
      ],
    });
  });

  it("falls back to a default filename when metadata is absent", () => {
    const result = convertLangChainMessages({
      type: "human",
      id: "human-file-no-filename",
      content: [
        {
          type: "file",
          data: "ZmxhdA==",
          mime_type: "application/pdf",
        },
      ],
    });

    expect(result).toMatchObject({
      role: "user",
      content: [
        {
          type: "file",
          filename: "file",
          data: "ZmxhdA==",
          mimeType: "application/pdf",
        },
      ],
    });
  });

  it("converts a url source file block", () => {
    const result = convertLangChainMessages({
      type: "human",
      id: "human-url-file",
      content: [
        {
          type: "file",
          url: "https://r2.example/u/abc/file.pdf",
          mime_type: "application/pdf",
          source_type: "url",
          metadata: { filename: "file.pdf" },
        },
      ],
    });

    expect(result).toMatchObject({
      role: "user",
      content: [
        {
          type: "file",
          filename: "file.pdf",
          data: "https://r2.example/u/abc/file.pdf",
          mimeType: "application/pdf",
        },
      ],
    });
  });

  it("converts an id source file block", () => {
    const result = convertLangChainMessages({
      type: "human",
      id: "human-id-file",
      content: [
        {
          type: "file",
          id: "file-abc123",
          source_type: "id",
        },
      ],
    });

    expect(result).toMatchObject({
      role: "user",
      content: [
        {
          type: "file",
          filename: "file",
          data: "file-abc123",
          mimeType: "application/octet-stream",
        },
      ],
    });
  });
});

describe("getMessageContent file blocks", () => {
  const appendMessage = (part: Record<string, unknown>) =>
    ({ content: [part] }) as unknown as AppendMessage;

  it("emits a base64 source block for raw base64 data", () => {
    const content = getMessageContent(
      appendMessage({
        type: "file",
        data: "ZmFrZQ==",
        mimeType: "application/pdf",
        filename: "a.pdf",
      }),
    );

    expect(content).toEqual([
      { type: "text", text: " " },
      {
        type: "file",
        data: "ZmFrZQ==",
        mime_type: "application/pdf",
        metadata: { filename: "a.pdf" },
        source_type: "base64",
      },
    ]);
  });

  it("emits a url source block with the value in the url key for http(s) data", () => {
    const content = getMessageContent(
      appendMessage({
        type: "file",
        data: "https://r2.example/u/abc/file.pdf",
        mimeType: "application/pdf",
        filename: "file.pdf",
      }),
    );

    expect(content).toEqual([
      { type: "text", text: " " },
      {
        type: "file",
        url: "https://r2.example/u/abc/file.pdf",
        mime_type: "application/pdf",
        metadata: { filename: "file.pdf" },
        source_type: "url",
      },
    ]);
    expect(content[1]).not.toHaveProperty("data");
  });

  it("normalizes a base64 data URL to a raw base64 block", () => {
    const content = getMessageContent(
      appendMessage({
        type: "file",
        data: "data:application/pdf;base64,ZmFrZQ==",
        mimeType: "application/octet-stream",
        filename: "a.pdf",
      }),
    );

    expect(content).toEqual([
      { type: "text", text: " " },
      {
        type: "file",
        data: "ZmFrZQ==",
        mime_type: "application/pdf",
        metadata: { filename: "a.pdf" },
        source_type: "base64",
      },
    ]);
  });

  it("keeps non-http schemes on the base64 path", () => {
    const content = getMessageContent(
      appendMessage({
        type: "file",
        data: "blob:https://app.example/123",
        mimeType: "application/pdf",
        filename: "a.pdf",
      }),
    );

    expect(content).toEqual([
      { type: "text", text: " " },
      {
        type: "file",
        data: "blob:https://app.example/123",
        mime_type: "application/pdf",
        metadata: { filename: "a.pdf" },
        source_type: "base64",
      },
    ]);
  });
});

describe("convertLangChainMessages reasoning content", () => {
  it("joins reasoning summary parts into a single reasoning part", () => {
    const result = convertLangChainMessages({
      type: "ai",
      id: "ai-reasoning-summary",
      content: [
        {
          type: "reasoning",
          summary: [
            { type: "summary_text", text: "first" },
            { type: "summary_text", text: "second" },
          ],
        },
      ],
    });

    expect(result).toMatchObject({
      role: "assistant",
      content: [{ type: "reasoning", text: "first\n\n\nsecond" }],
    });
  });

  it("falls back to reasoning text when summary is absent", () => {
    const result = convertLangChainMessages({
      type: "ai",
      id: "ai-reasoning",
      content: [
        {
          type: "reasoning",
          reasoning: "I should compare both options first.",
        },
      ],
    });

    expect(result).toMatchObject({
      role: "assistant",
      content: [
        {
          type: "reasoning",
          text: "I should compare both options first.",
        },
      ],
    });
  });

  it("tolerates null entries inside the summary array", () => {
    const result = convertLangChainMessages({
      type: "ai",
      id: "ai-reasoning-null-summary",
      content: [
        {
          type: "reasoning",
          summary: [null, { type: "summary_text", text: "kept" }],
        } as any,
      ],
    });

    expect(result).toMatchObject({
      role: "assistant",
      content: [{ type: "reasoning", text: "\n\n\nkept" }],
    });
  });

  it("does not throw when a reasoning block omits summary and reasoning", () => {
    expect(() =>
      convertLangChainMessages({
        type: "ai",
        id: "ai-reasoning-empty",
        content: [{ type: "reasoning" } as any],
      }),
    ).not.toThrow();
  });
});

describe("convertLangChainMessages image content", () => {
  it("reads the url from an image_url object", () => {
    const result = convertLangChainMessages({
      type: "human",
      id: "human-image",
      content: [
        { type: "image_url", image_url: { url: "https://example.com/a.png" } },
      ],
    });

    expect(result).toMatchObject({
      role: "user",
      content: [{ type: "image", image: "https://example.com/a.png" }],
    });
  });

  it("drops the image part when image_url is undefined", () => {
    const result = convertLangChainMessages({
      type: "human",
      id: "human-image-undefined",
      content: [{ type: "image_url" } as any],
    });

    expect(result.content).toEqual([]);
  });
});

describe("convertLangChainMessages UI messages", () => {
  it("appends matching UI messages as data parts on the assistant message", () => {
    const uiMessage: UIMessage = {
      type: "ui",
      id: "ui-1",
      name: "chart",
      props: { series: [1, 2, 3] },
      metadata: { message_id: "ai-1" },
    };

    const result = convertLangChainMessages(
      {
        type: "ai",
        id: "ai-1",
        content: "Here's your chart.",
      },
      {
        uiMessagesByParent: new Map([["ai-1", [uiMessage]]]),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    );

    expect(result).toMatchObject({
      role: "assistant",
      content: [
        { type: "text", text: "Here's your chart." },
        { type: "data", name: "chart", data: { series: [1, 2, 3] } },
      ],
    });
  });

  it("preserves the order of multiple UI messages for the same parent", () => {
    const uiMessages: UIMessage[] = [
      { type: "ui", id: "ui-1", name: "chart", props: { a: 1 } },
      { type: "ui", id: "ui-2", name: "table", props: { b: 2 } },
    ];

    const result = convertLangChainMessages(
      {
        type: "ai",
        id: "ai-1",
        content: "",
      },
      {
        uiMessagesByParent: new Map([["ai-1", uiMessages]]),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    );

    expect(result).toMatchObject({
      role: "assistant",
      content: [
        { type: "text", text: "" },
        { type: "data", name: "chart", data: { a: 1 } },
        { type: "data", name: "table", data: { b: 2 } },
      ],
    });
  });

  it("does not inject data parts when the map has no entry for this message", () => {
    const result = convertLangChainMessages(
      {
        type: "ai",
        id: "ai-2",
        content: "No UI here.",
      },
      {
        uiMessagesByParent: new Map([
          [
            "ai-1",
            [
              { type: "ui", id: "ui-1", name: "chart", props: {} },
            ] as UIMessage[],
          ],
        ]),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    );

    expect(result).toMatchObject({
      role: "assistant",
      content: [{ type: "text", text: "No UI here." }],
    });
  });

  it("does not inject data parts when metadata.uiMessagesByParent is absent", () => {
    const result = convertLangChainMessages(
      {
        type: "ai",
        id: "ai-1",
        content: "Plain response.",
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
    );

    expect(result).toMatchObject({
      role: "assistant",
      content: [{ type: "text", text: "Plain response." }],
    });
  });
});

describe("convertLangChainMessages tool call id stability (regression #3526)", () => {
  it("synthesizes a stable toolCallId when chunk.id is empty string", () => {
    const result = convertLangChainMessages({
      type: "ai",
      id: "ai-1",
      content: "",
      tool_calls: [
        { id: "", name: "weather", args: { city: "Tokyo" }, index: 0 },
      ],
    });

    if (!("content" in result)) throw new Error("Expected assistant message");
    const toolCallPart = result.content.find((p) => p.type === "tool-call");
    expect(toolCallPart).toMatchObject({
      type: "tool-call",
      toolName: "weather",
    });
    expect((toolCallPart as { toolCallId: string }).toolCallId).not.toBe("");
    expect((toolCallPart as { toolCallId: string }).toolCallId).toBe(
      "lc-toolcall-ai-1-0",
    );
  });

  it("synthesizes unique ids for multiple empty-id tool_calls in the same message", () => {
    const result = convertLangChainMessages({
      type: "ai",
      id: "ai-1",
      content: "",
      tool_calls: [
        { id: "", name: "a", args: {}, index: 0 },
        { id: "", name: "b", args: {}, index: 1 },
      ],
    });

    if (!("content" in result)) throw new Error("Expected assistant message");
    const ids = result.content
      .filter((p) => p.type === "tool-call")
      .map((p) => (p as { toolCallId: string }).toolCallId);
    expect(ids).toEqual(["lc-toolcall-ai-1-0", "lc-toolcall-ai-1-1"]);
  });

  it("falls back to array index when both chunk.id and chunk.index are missing", () => {
    const result = convertLangChainMessages({
      type: "ai",
      id: "ai-1",
      content: "",
      tool_calls: [
        { id: "", name: "a", args: {} },
        { id: "", name: "b", args: {} },
      ],
    });

    if (!("content" in result)) throw new Error("Expected assistant message");
    const ids = result.content
      .filter((p) => p.type === "tool-call")
      .map((p) => (p as { toolCallId: string }).toolCallId);
    expect(ids).toEqual(["lc-toolcall-ai-1-0", "lc-toolcall-ai-1-1"]);
  });

  it("prefers real chunk.id over synthesized id when present", () => {
    const result = convertLangChainMessages({
      type: "ai",
      id: "ai-1",
      content: "",
      tool_calls: [
        { id: "call_real_abc", name: "weather", args: {}, index: 0 },
      ],
    });

    if (!("content" in result)) throw new Error("Expected assistant message");
    const toolCallPart = result.content.find((p) => p.type === "tool-call");
    expect((toolCallPart as { toolCallId: string }).toolCallId).toBe(
      "call_real_abc",
    );
  });

  it("does not collide synthesized id with a real id at a different index", () => {
    const result = convertLangChainMessages({
      type: "ai",
      id: "ai-1",
      content: "",
      tool_calls: [
        { id: "", name: "a", args: {}, index: 0 },
        { id: "call_real_abc", name: "b", args: {}, index: 1 },
      ],
    });

    if (!("content" in result)) throw new Error("Expected assistant message");
    const ids = result.content
      .filter((p) => p.type === "tool-call")
      .map((p) => (p as { toolCallId: string }).toolCallId);
    expect(ids).toEqual(["lc-toolcall-ai-1-0", "call_real_abc"]);
  });

  it("synthesized id is stable across re-renders of the same message", () => {
    const message: LangChainMessage = {
      type: "ai",
      id: "ai-1",
      content: "",
      tool_calls: [{ id: "", name: "weather", args: {}, index: 0 }],
    };

    const r1 = convertLangChainMessages(message);
    const r2 = convertLangChainMessages(message);

    if (!("content" in r1) || !("content" in r2))
      throw new Error("Expected assistant messages");
    const id1 = (
      r1.content.find((p) => p.type === "tool-call") as { toolCallId: string }
    ).toolCallId;
    const id2 = (
      r2.content.find((p) => p.type === "tool-call") as { toolCallId: string }
    ).toolCallId;
    expect(id1).toBe(id2);
  });

  it("matches tool_call_chunks by index when chunk.id is empty (preserves args_json)", () => {
    const result = convertLangChainMessages({
      type: "ai",
      id: "ai-1",
      content: "",
      tool_calls: [{ id: "", name: "fetch", args: {}, index: 0 }],
      tool_call_chunks: [
        {
          id: "",
          index: 0,
          name: "fetch",
          args_json: '{"url":"https://example.com"}',
        },
      ],
    });

    if (!("content" in result)) throw new Error("Expected assistant message");
    const toolCallPart = result.content.find((p) => p.type === "tool-call");
    expect(toolCallPart).toMatchObject({
      argsText: '{"url":"https://example.com"}',
    });
  });
});

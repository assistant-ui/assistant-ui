import { describe, it, expect } from "vitest";
import { convertLangChainMessages } from "./convertLangChainMessages";
import type { UIMessage } from "./types";

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
        metadata: { model: "gpt-4", speaker_name: "Assistant" },
      },
    });

    expect(result).toMatchObject({
      role: "assistant",
      metadata: { custom: { model: "gpt-4", speaker_name: "Assistant" } },
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
  it("converts legacy nested file content blocks", () => {
    const result = convertLangChainMessages({
      type: "human",
      id: "human-legacy-file",
      content: [
        {
          type: "file",
          file: {
            filename: "legacy.pdf",
            file_data: "bGVnYWN5",
            mime_type: "application/pdf",
          },
        },
      ],
    });

    expect(result).toMatchObject({
      role: "user",
      content: [
        {
          type: "file",
          filename: "legacy.pdf",
          data: "bGVnYWN5",
          mimeType: "application/pdf",
        },
      ],
    });
  });

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

  it("converts file blocks with top-level base64 field", () => {
    const result = convertLangChainMessages({
      type: "human",
      id: "human-top-level-base64-file",
      content: [
        {
          type: "file",
          filename: "top-level.pdf",
          base64: "dG9wLWxldmVs",
          mime_type: "application/pdf",
        },
      ],
    });

    expect(result).toMatchObject({
      role: "user",
      content: [
        {
          type: "file",
          filename: "top-level.pdf",
          data: "dG9wLWxldmVs",
          mimeType: "application/pdf",
        },
      ],
    });
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

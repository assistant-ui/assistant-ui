import { describe, expect, it } from "vitest";
import type { ReadonlyJSONObject } from "assistant-stream/utils";
import {
  AISDKMessageConverter,
  type AISDKMessageConverterMetadata,
} from "./convertMessage";

describe("AISDKMessageConverter", () => {
  it("converts user files into attachments and keeps text content", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "u1",
        role: "user",
        parts: [
          { type: "text", text: "hello" },
          {
            type: "file",
            mediaType: "image/png",
            url: "https://cdn/img.png",
            filename: "img.png",
          },
          {
            type: "file",
            mediaType: "application/pdf",
            url: "https://cdn/file.pdf",
            filename: "file.pdf",
          },
        ],
      } as any,
    ]);

    expect(converted).toHaveLength(1);
    expect(converted[0]?.role).toBe("user");
    expect(converted[0]?.content).toHaveLength(1);
    expect(converted[0]?.content[0]).toMatchObject({
      type: "text",
      text: "hello",
    });
    expect(converted[0]?.attachments).toHaveLength(2);
    expect(converted[0]?.attachments?.[0]?.type).toBe("image");
    expect(converted[0]?.attachments?.[1]?.type).toBe("file");
  });

  it("converts source-document parts into document sources", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "source-document",
            sourceId: "doc_123",
            title: "proposal.pdf",
            mediaType: "application/pdf",
            filename: "proposal.pdf",
            providerMetadata: {
              openai: {
                type: "file_citation",
                fileId: "file_123",
                index: 0,
              },
            },
          },
        ],
      } as any,
    ]);

    expect(converted).toHaveLength(1);
    expect(converted[0]?.role).toBe("assistant");

    const sourcePart = converted[0]?.content.find(
      (part): part is any => part.type === "source",
    );

    expect(sourcePart).toMatchObject({
      type: "source",
      sourceType: "document",
      id: "doc_123",
      title: "proposal.pdf",
      mediaType: "application/pdf",
      filename: "proposal.pdf",
      providerMetadata: {
        openai: {
          type: "file_citation",
          fileId: "file_123",
          index: 0,
        },
      },
    });
  });

  it("converts source-url parts without synthesizing missing optional fields", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "source-url",
            sourceId: "url_123",
            url: "https://example.com/report",
            providerMetadata: {
              openai: {
                type: "url_citation",
                index: 1,
              },
            },
          },
        ],
      } as any,
    ]);

    const sourcePart = converted[0]?.content.find(
      (part): part is any => part.type === "source",
    );

    expect(sourcePart).toMatchObject({
      type: "source",
      sourceType: "url",
      id: "url_123",
      url: "https://example.com/report",
      providerMetadata: {
        openai: {
          type: "url_citation",
          index: 1,
        },
      },
    });
    expect(sourcePart).not.toHaveProperty("title");
  });

  it("converts assistant image file parts into file content", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          { type: "text", text: "Here is the image" },
          {
            type: "file",
            mediaType: "image/png",
            url: "https://cdn/generated.png",
            filename: "generated.png",
          },
        ],
      } as any,
    ]);

    expect(converted).toHaveLength(1);
    expect(converted[0]?.role).toBe("assistant");
    expect(converted[0]?.content).toHaveLength(2);
    expect(converted[0]?.content[0]).toMatchObject({
      type: "text",
      text: "Here is the image",
    });
    expect(converted[0]?.content[1]).toMatchObject({
      type: "file",
      data: "https://cdn/generated.png",
      mimeType: "image/png",
      filename: "generated.png",
    });
  });

  it("converts assistant non-image file parts into file content", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          { type: "text", text: "Here is the PDF" },
          {
            type: "file",
            mediaType: "application/pdf",
            url: "data:application/pdf;base64,abc123",
            filename: "report.pdf",
          },
        ],
      } as any,
    ]);

    expect(converted).toHaveLength(1);
    expect(converted[0]?.role).toBe("assistant");
    expect(converted[0]?.content).toHaveLength(2);
    expect(converted[0]?.content[1]).toMatchObject({
      type: "file",
      data: "data:application/pdf;base64,abc123",
      mimeType: "application/pdf",
      filename: "report.pdf",
    });
  });

  it("deduplicates tool calls by toolCallId and surfaces approval / interrupt state", () => {
    const converted = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-weather",
              toolCallId: "tc-1",
              state: "output-available",
              input: { city: "NYC" },
              output: { temp: 72 },
            },
            {
              type: "tool-weather",
              toolCallId: "tc-1",
              state: "output-available",
              input: { city: "NYC" },
              output: { temp: 73 },
            },
            {
              type: "tool-approve",
              toolCallId: "tc-2",
              state: "approval-requested",
              input: { action: "deploy" },
              approval: { id: "appr-1" },
            },
            {
              type: "tool-human",
              toolCallId: "tc-3",
              state: "input-available",
              input: { task: "confirm" },
            },
            {
              type: "tool-approve",
              toolCallId: "tc-4",
              state: "approval-responded",
              input: { action: "rollback" },
              approval: { id: "appr-2", approved: true, reason: "looks ok" },
            },
            {
              type: "tool-approve",
              toolCallId: "tc-5",
              state: "approval-requested",
              input: { action: "auto" },
              approval: { id: "appr-3", isAutomatic: true },
            },
            {
              type: "tool-approve",
              toolCallId: "tc-6",
              state: "output-denied",
              input: { action: "wipe" },
              approval: {
                id: "appr-4",
                approved: false,
                reason: "user denied",
              },
            },
            {
              type: "tool-approve",
              toolCallId: "tc-7",
              state: "output-available",
              input: { action: "ship" },
              output: { ok: true },
              approval: { id: "appr-5", approved: true, isAutomatic: true },
            },
          ],
        } as any,
      ],
      false,
      {
        toolStatuses: {
          "tc-3": {
            type: "interrupt",
            payload: { type: "human", payload: { kind: "human" } },
          },
        },
      },
    );

    const toolCalls = converted[0]?.content.filter(
      (part): part is any => part.type === "tool-call",
    );
    expect(toolCalls).toHaveLength(7);

    expect(toolCalls?.filter((p) => p.toolCallId === "tc-1")).toHaveLength(1);

    expect(toolCalls?.find((p) => p.toolCallId === "tc-2")?.approval).toEqual({
      id: "appr-1",
    });
    expect(
      toolCalls?.find((p) => p.toolCallId === "tc-2")?.interrupt,
    ).toBeUndefined();

    expect(toolCalls?.find((p) => p.toolCallId === "tc-3")?.interrupt).toEqual({
      type: "human",
      payload: { kind: "human" },
    });
    expect(
      toolCalls?.find((p) => p.toolCallId === "tc-3")?.approval,
    ).toBeUndefined();

    expect(toolCalls?.find((p) => p.toolCallId === "tc-4")?.approval).toEqual({
      id: "appr-2",
      approved: true,
      reason: "looks ok",
    });

    expect(toolCalls?.find((p) => p.toolCallId === "tc-5")?.approval).toEqual({
      id: "appr-3",
      isAutomatic: true,
    });

    const denied = toolCalls?.find((p) => p.toolCallId === "tc-6");
    expect(denied?.approval).toEqual({
      id: "appr-4",
      approved: false,
      reason: "user denied",
    });
    expect(denied?.isError).toBe(true);

    expect(toolCalls?.find((p) => p.toolCallId === "tc-7")?.approval).toEqual({
      id: "appr-5",
      approved: true,
      isAutomatic: true,
    });
  });

  it("strips closing delimiters from streaming tool argsText", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-weather",
            toolCallId: "tc-1",
            state: "input-streaming",
            input: { city: "NYC" },
          },
        ],
      } as any,
    ]);

    const toolCall = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(toolCall?.argsText).toBe('{"city":"NYC');
  });

  it("keeps observed key order from streaming snapshots for final tool args", () => {
    const metadata: AISDKMessageConverterMetadata = {
      toolArgsKeyOrderCache: new Map<string, Map<string, string[]>>(),
    };

    const streaming = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-stocks",
              toolCallId: "tc-order-1",
              state: "input-streaming",
              input: {
                type: "high_stock_model",
                limit: 5,
                filters: {
                  region: "us",
                  sector: "tech",
                },
              },
            },
          ],
        } as any,
      ],
      false,
      metadata,
    );

    const streamingToolCall = streaming[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(streamingToolCall?.argsText).toBe(
      '{"type":"high_stock_model","limit":5,"filters":{"region":"us","sector":"tech',
    );

    const final = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-stocks",
              toolCallId: "tc-order-1",
              state: "input-available",
              input: {
                filters: {
                  sector: "tech",
                  region: "us",
                },
                limit: 5,
                type: "high_stock_model",
              },
            },
          ],
        } as any,
      ],
      false,
      metadata,
    );

    const finalToolCall = final[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(finalToolCall?.argsText).toBe(
      '{"type":"high_stock_model","limit":5,"filters":{"region":"us","sector":"tech"}}',
    );
  });

  it("merges duplicate toolCallId across assistant snapshots", () => {
    const metadata: AISDKMessageConverterMetadata = {
      toolArgsKeyOrderCache: new Map<string, Map<string, string[]>>(),
    };

    const converted = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-stocks",
              toolCallId: "tc-order-1",
              state: "input-streaming",
              input: {
                type: "high_stock_model",
                limit: 5,
              },
            },
          ],
        } as any,
        {
          id: "a2",
          role: "assistant",
          parts: [
            {
              type: "tool-stocks",
              toolCallId: "tc-order-1",
              state: "input-available",
              input: {
                limit: 5,
                type: "high_stock_model",
              },
            },
          ],
        } as any,
      ],
      false,
      metadata,
    );

    const toolCalls = converted[0]?.content.filter(
      (part): part is any => part.type === "tool-call",
    );
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls?.[0]?.toolCallId).toBe("tc-order-1");
    expect(JSON.parse(toolCalls?.[0]?.argsText ?? "{}")).toEqual({
      type: "high_stock_model",
      limit: 5,
    });
  });

  it("preserves last good input when AI SDK briefly emits null input", () => {
    const metadata: AISDKMessageConverterMetadata = {
      toolArgsKeyOrderCache: new Map<string, Map<string, string[]>>(),
      toolLastInputCache: new Map<string, ReadonlyJSONObject>(),
    };

    const convertWithInput = (input: unknown) =>
      AISDKMessageConverter.toThreadMessages(
        [
          {
            id: "a1",
            role: "assistant",
            parts: [
              {
                type: "tool-weather",
                toolCallId: "tc-1",
                state: "input-streaming",
                input,
              },
            ],
          } as any,
        ],
        false,
        metadata,
      )[0]?.content.find((part): part is any => part.type === "tool-call");

    const first = convertWithInput({ city: "NYC" });
    expect(first?.argsText).toBe('{"city":"NYC');
    expect(first?.args).toEqual({ city: "NYC" });

    const dropped = convertWithInput(null);
    expect(dropped?.argsText).toBe('{"city":"NYC');
    expect(dropped?.args).toEqual({ city: "NYC" });

    const undef = convertWithInput(undefined);
    expect(undef?.argsText).toBe('{"city":"NYC');
    expect(undef?.args).toEqual({ city: "NYC" });

    const grown = convertWithInput({ city: "NYC", units: "F" });
    expect(grown?.argsText).toBe('{"city":"NYC","units":"F');
    expect(grown?.args).toEqual({ city: "NYC", units: "F" });
  });

  it("preserves last good input across terminal state transitions", () => {
    const metadata: AISDKMessageConverterMetadata = {
      toolArgsKeyOrderCache: new Map<string, Map<string, string[]>>(),
      toolLastInputCache: new Map<string, ReadonlyJSONObject>(),
    };

    AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-weather",
              toolCallId: "tc-1",
              state: "input-available",
              input: { city: "NYC" },
            },
          ],
        } as any,
      ],
      false,
      metadata,
    );

    const terminal = AISDKMessageConverter.toThreadMessages(
      [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool-weather",
              toolCallId: "tc-1",
              state: "output-available",
              input: null,
              output: { temp: 70 },
            },
          ],
        } as any,
      ],
      false,
      metadata,
    );

    const call = terminal[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(call?.args).toEqual({ city: "NYC" });
    expect(call?.result).toEqual({ temp: 70 });
  });

  it("unwraps the modelContent envelope produced by frontend tool execution", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-readPdf",
            toolCallId: "tc-pdf",
            state: "output-available",
            input: {},
            output: {
              __aui_modelContent: [
                { type: "text", text: "PDF contents:" },
                {
                  type: "file",
                  data: "JVBERi0xLjQK",
                  mediaType: "application/pdf",
                },
              ],
              value: { mediaType: "application/pdf", base64: "JVBERi0xLjQK" },
            },
          },
        ],
      } as any,
    ]);

    const call = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(call?.result).toEqual({
      mediaType: "application/pdf",
      base64: "JVBERi0xLjQK",
    });
    expect(call?.modelContent).toEqual([
      { type: "text", text: "PDF contents:" },
      {
        type: "file",
        data: "JVBERi0xLjQK",
        mediaType: "application/pdf",
      },
    ]);
  });

  it("leaves a plain output untouched when no envelope is present", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-weather",
            toolCallId: "tc-1",
            state: "output-available",
            input: { city: "NYC" },
            output: { temp: 72 },
          },
        ],
      } as any,
    ]);

    const call = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(call?.result).toEqual({ temp: 72 });
    expect(call?.modelContent).toBeUndefined();
  });

  it("forwards callProviderMetadata.mcp.app onto ToolCallMessagePart.mcp.app", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-search",
            toolCallId: "tc-1",
            state: "output-available",
            input: { query: "hi" },
            output: { results: [] },
            callProviderMetadata: {
              mcp: {
                app: {
                  resourceUri: "ui://example/search",
                  mimeType: "text/html;profile=mcp-app",
                  visibility: ["app", "model", "bogus"],
                },
              },
            },
          },
        ],
      } as any,
    ]);

    const call = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(call?.mcp?.app).toEqual({
      resourceUri: "ui://example/search",
      mimeType: "text/html;profile=mcp-app",
      visibility: ["app", "model"],
    });
  });

  it("extracts MCP app metadata from output._meta['ui/resourceUri']", () => {
    const converted = AISDKMessageConverter.toThreadMessages([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-hello_ui",
            toolCallId: "tc-1",
            state: "output-available",
            input: {},
            output: {
              _meta: { "ui/resourceUri": "ui://app/hello_ui.html" },
              content: [{ type: "text", text: "" }],
            },
          },
        ],
      } as any,
    ]);

    const call = converted[0]?.content.find(
      (part): part is any => part.type === "tool-call",
    );
    expect(call?.mcp?.app).toEqual({
      resourceUri: "ui://app/hello_ui.html",
    });
  });

  it("memoizes MCP app metadata across conversions by resourceUri", () => {
    const metadata: AISDKMessageConverterMetadata = {
      mcpAppMetadataCache: new Map(),
    };

    const buildMessage = (id: string) => ({
      id,
      role: "assistant" as const,
      parts: [
        {
          type: "tool-search",
          toolCallId: `${id}-call`,
          state: "output-available",
          input: { q: "hi" },
          output: {},
          callProviderMetadata: {
            mcp: { app: { resourceUri: "ui://example/search" } },
          },
        } as any,
      ],
    });

    const first = AISDKMessageConverter.toThreadMessages(
      [buildMessage("a1")],
      false,
      metadata,
    );
    const second = AISDKMessageConverter.toThreadMessages(
      [buildMessage("a2")],
      false,
      metadata,
    );

    const firstApp = first[0]?.content.find(
      (p): p is any => p.type === "tool-call",
    )?.mcp?.app;
    const secondApp = second[0]?.content.find(
      (p): p is any => p.type === "tool-call",
    )?.mcp?.app;
    expect(firstApp).toBeDefined();
    expect(firstApp).toBe(secondApp);
  });
});

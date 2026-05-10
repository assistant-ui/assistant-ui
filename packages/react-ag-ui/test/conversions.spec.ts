"use client";

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { UserMessageSchema } from "@ag-ui/client";
import {
  fromAgUiMessages,
  toAgUiMessages,
  toAgUiTools,
} from "../src/runtime/adapter/conversions";

describe("adapter conversions", () => {
  it("converts thread messages to AG-UI format", () => {
    const result = toAgUiMessages([
      {
        id: "1",
        role: "user",
        content: [{ type: "text", text: "Hello" }],
      },
      {
        id: "2",
        role: "assistant",
        content: [
          { type: "text", text: "Hi" },
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "search",
            argsText: '{"query":"x"}',
          },
        ],
      },
    ] as any);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ role: "user", content: "Hello" });
    const toolCall = (result[1] as any).toolCalls?.[0];
    expect(toolCall).toMatchObject({
      id: "call-1",
      function: { name: "search", arguments: '{"query":"x"}' },
    });
  });

  it("marks errored tool call results with error content", () => {
    const result = toAgUiMessages([
      {
        id: "assistant-1",
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-99",
            toolName: "do-it",
            argsText: "{}",
            result: { error: "nope" },
            isError: true,
          },
        ],
      },
    ] as any);

    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({
      role: "tool",
      toolCallId: "call-99",
      content: '{"error":"nope"}',
      error: '{"error":"nope"}',
    });
  });

  it("includes tool messages for completed tool calls", () => {
    const result = toAgUiMessages([
      {
        id: "assistant-1",
        role: "assistant",
        content: [
          { type: "text", text: "Working..." },
          {
            type: "tool-call",
            toolCallId: "call-42",
            toolName: "search",
            argsText: '{"query":"x"}',
            result: { ok: true },
          },
        ],
      },
    ] as any);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      role: "assistant",
      content: "Working...",
      toolCalls: [
        {
          id: "call-42",
          function: { name: "search", arguments: '{"query":"x"}' },
        },
      ],
    });
    expect(result[1]).toMatchObject({
      role: "tool",
      toolCallId: "call-42",
      content: '{"ok":true}',
    });
  });

  it("merges tool role snapshot messages back into assistant tool-call parts", () => {
    const result = fromAgUiMessages([
      {
        id: "msg-1",
        role: "user",
        content: "What's the weather?",
      },
      {
        id: "msg-2",
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            function: {
              name: "get_weather",
              arguments: '{"city":"Paris"}',
            },
          },
        ],
      },
      {
        id: "msg-3",
        role: "tool",
        tool_call_id: "call-1",
        content: '{"temperature":"22C"}',
      },
    ] as any);

    expect(result).toHaveLength(2);
    const assistantMessage = result[1] as any;
    expect(assistantMessage.role).toBe("assistant");
    const toolPart = assistantMessage.content.find(
      (part: { type: string }) => part.type === "tool-call",
    );
    expect(toolPart).toMatchObject({
      toolCallId: "call-1",
      toolName: "get_weather",
      argsText: '{"city":"Paris"}',
      result: { temperature: "22C" },
    });
  });

  it("creates a synthetic assistant tool-call when snapshot has an orphan tool message", () => {
    const result = fromAgUiMessages([
      {
        id: "tool-only",
        role: "tool",
        tool_call_id: "call-9",
        name: "lookup",
        content: '{"ok":true}',
      },
    ] as any);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      role: "assistant",
      id: "tool-only:assistant",
    });
    const toolPart = (result[0] as any).content[0];
    expect(toolPart).toMatchObject({
      type: "tool-call",
      toolCallId: "call-9",
      toolName: "lookup",
      result: { ok: true },
    });
  });

  it("filters disabled/back-end tools", () => {
    const tools = toAgUiTools({
      search: { description: "Search", parameters: { type: "object" } },
      disabled: { disabled: true },
      backend: { type: "backend" },
    });

    expect(tools).toHaveLength(1);
    expect(tools[0]).toMatchObject({ name: "search" });
  });

  it("prefers available schema conversion helpers for tools", () => {
    const tools = toAgUiTools({
      jsonTool: { parameters: { toJSON: () => ({ type: "object" }) } },
      schemaTool: { parameters: { toJSONSchema: () => ({ type: "string" }) } },
      plain: { parameters: { type: "boolean" } },
    });

    expect(tools).toEqual([
      {
        name: "jsonTool",
        description: undefined,
        parameters: { type: "object" },
      },
      {
        name: "schemaTool",
        description: undefined,
        parameters: { type: "string" },
      },
      {
        name: "plain",
        description: undefined,
        parameters: { type: "boolean" },
      },
    ]);
  });

  it("preserves tool message ID through round-trip conversion", () => {
    const agUiMessages = [
      {
        id: "msg-1",
        role: "user",
        content: "What's the weather?",
      },
      {
        id: "msg-2",
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            function: {
              name: "get_weather",
              arguments: '{"city":"Paris"}',
            },
          },
        ],
      },
      {
        id: "tool-msg-original-id",
        role: "tool",
        tool_call_id: "call-1",
        content: '{"temperature":"22C"}',
      },
    ] as any;

    const threadMessages = fromAgUiMessages(agUiMessages);
    const roundTripped = toAgUiMessages(threadMessages);

    const toolMessage = roundTripped.find((m) => m.role === "tool");
    expect(toolMessage).toBeDefined();
    expect(toolMessage!.id).toBe("tool-msg-original-id");
  });

  it("converts Zod schemas to JSON Schema format", () => {
    const zodSchema = z.object({
      message: z.string().describe("Text to log to the console."),
    });

    const tools = toAgUiTools({
      console_log: {
        description: "Log a message to the console.",
        parameters: zodSchema,
      },
    });

    expect(tools).toHaveLength(1);
    expect(tools[0]).toMatchObject({
      name: "console_log",
      description: "Log a message to the console.",
    });
    // Verify parameters is a plain JSON Schema object, not a Zod instance
    expect(tools[0]!.parameters).toMatchObject({
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Text to log to the console.",
        },
      },
      required: ["message"],
    });
    // Ensure it's not a Zod instance (no Zod methods)
    expect(tools[0]!.parameters).not.toHaveProperty("parse");
    expect(tools[0]!.parameters).not.toHaveProperty("_def");
  });

  it("returns plain string content when user message has no attachments", () => {
    const result = toAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [{ type: "text", text: "Hello" }],
      },
    ] as any);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ role: "user", content: "Hello" });
    expect(() => UserMessageSchema.parse(result[0])).not.toThrow();
  });

  it("converts image attachment with data URL to AG-UI image source", () => {
    const result = toAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [{ type: "text", text: "What is this?" }],
        attachments: [
          {
            id: "a-1",
            type: "image",
            name: "photo.png",
            content: [
              {
                type: "image",
                image: "data:image/png;base64,iVBORw0KGgoAAAA=",
              },
            ],
          },
        ],
      },
    ] as any);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      role: "user",
      content: [
        { type: "text", text: "What is this?" },
        {
          type: "image",
          source: {
            type: "data",
            value: "iVBORw0KGgoAAAA=",
            mimeType: "image/png",
          },
        },
      ],
    });
    expect(() => UserMessageSchema.parse(result[0])).not.toThrow();
  });

  it("converts image attachment with http URL to AG-UI image url source", () => {
    const result = toAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [{ type: "text", text: "hi" }],
        attachments: [
          {
            id: "a-1",
            type: "image",
            name: "remote.jpg",
            contentType: "image/jpeg",
            content: [
              { type: "image", image: "https://example.com/remote.jpg" },
            ],
          },
        ],
      },
    ] as any);

    expect(result[0]).toMatchObject({
      role: "user",
      content: [
        { type: "text", text: "hi" },
        {
          type: "image",
          source: {
            type: "url",
            value: "https://example.com/remote.jpg",
            mimeType: "image/jpeg",
          },
        },
      ],
    });
    expect(() => UserMessageSchema.parse(result[0])).not.toThrow();
  });

  it("converts file attachment to AG-UI binary with filename preserved", () => {
    const result = toAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [{ type: "text", text: "review this" }],
        attachments: [
          {
            id: "a-1",
            type: "document",
            name: "spec.pdf",
            contentType: "application/pdf",
            content: [
              {
                type: "file",
                data: "JVBERi0xLjQK",
                mimeType: "application/pdf",
                filename: "spec.pdf",
              },
            ],
          },
        ],
      },
    ] as any);

    expect(result[0]).toMatchObject({
      role: "user",
      content: [
        { type: "text", text: "review this" },
        {
          type: "binary",
          mimeType: "application/pdf",
          data: "JVBERi0xLjQK",
          filename: "spec.pdf",
        },
      ],
    });
    expect(() => UserMessageSchema.parse(result[0])).not.toThrow();
  });

  it("handles user message with only attachment and empty text", () => {
    const result = toAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [],
        attachments: [
          {
            id: "a-1",
            type: "image",
            name: "pic.png",
            content: [
              {
                type: "image",
                image: "data:image/png;base64,AAAA",
              },
            ],
          },
        ],
      },
    ] as any);

    expect(result[0]).toMatchObject({
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "data",
            value: "AAAA",
            mimeType: "image/png",
          },
        },
      ],
    });
    expect(() => UserMessageSchema.parse(result[0])).not.toThrow();
  });

  it("preserves string-form content when non-text attachments are present", () => {
    const result = toAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: "What is in this image?",
        attachments: [
          {
            id: "a-1",
            type: "image",
            name: "photo.png",
            content: [
              {
                type: "image",
                image: "data:image/png;base64,AAAA",
              },
            ],
          },
        ],
      },
    ] as any);

    expect(result[0]).toMatchObject({
      role: "user",
      content: [
        { type: "text", text: "What is in this image?" },
        {
          type: "image",
          source: {
            type: "data",
            value: "AAAA",
            mimeType: "image/png",
          },
        },
      ],
    });
    expect(() => UserMessageSchema.parse(result[0])).not.toThrow();
  });

  it("preserves text parts from attachments in the string fallback", () => {
    const result = toAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [{ type: "text", text: "hi" }],
        attachments: [
          {
            id: "a-1",
            type: "document",
            name: "notes.txt",
            content: [
              {
                type: "text",
                text: "<attachment name=notes.txt>extracted content</attachment>",
              },
            ],
          },
        ],
      },
    ] as any);

    expect(result[0]!.content).toBe(
      "hi\n<attachment name=notes.txt>extracted content</attachment>",
    );
    expect(() => UserMessageSchema.parse(result[0])).not.toThrow();
  });

  it("parses data URL with charset parameter (e.g. SVG)", () => {
    const result = toAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [],
        attachments: [
          {
            id: "a-1",
            type: "image",
            name: "icon.svg",
            content: [
              {
                type: "image",
                image:
                  "data:image/svg+xml;charset=utf-8;base64,PHN2ZyB4bWxucz0=",
              },
            ],
          },
        ],
      },
    ] as any);

    expect(result[0]).toMatchObject({
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "data",
            value: "PHN2ZyB4bWxucz0=",
            mimeType: "image/svg+xml",
          },
        },
      ],
    });
    expect(() => UserMessageSchema.parse(result[0])).not.toThrow();
  });

  it("routes http file data to binary.url not binary.data", () => {
    const result = toAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [],
        attachments: [
          {
            id: "a-1",
            type: "file",
            name: "report.pdf",
            content: [
              {
                type: "file",
                data: "https://cdn.example.com/report.pdf",
                mimeType: "application/pdf",
                filename: "report.pdf",
              },
            ],
          },
        ],
      },
    ] as any);

    expect(result[0]).toMatchObject({
      role: "user",
      content: [
        {
          type: "binary",
          mimeType: "application/pdf",
          url: "https://cdn.example.com/report.pdf",
          filename: "report.pdf",
        },
      ],
    });
    expect((result[0] as any).content[0]).not.toHaveProperty("data");
    expect(() => UserMessageSchema.parse(result[0])).not.toThrow();
  });
});

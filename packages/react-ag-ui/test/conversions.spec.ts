"use client";

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { UserMessageSchema } from "@ag-ui/client";
import { ExportedMessageRepository } from "@assistant-ui/core";
import { fromAgUiMessages as publicFromAgUiMessages } from "../src";
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

  it("excludes synthesized a2ui tool calls and results from outbound messages", () => {
    const result = toAgUiMessages([
      {
        id: "assistant-1",
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-42",
            toolName: "search",
            argsText: '{"query":"x"}',
            result: { ok: true },
          },
          {
            type: "tool-call",
            toolCallId: "a2ui:surface-1",
            toolName: "present",
            argsText: '{"$type":"Markdown","value":"Welcome"}',
            result: {},
          },
        ],
      },
    ] as any);

    expect(result).toHaveLength(2);
    const assistantMessage = result[0] as any;
    expect(assistantMessage.role).toBe("assistant");
    expect(assistantMessage.toolCalls).toHaveLength(1);
    expect(assistantMessage.toolCalls[0]).toMatchObject({
      id: "call-42",
      function: { name: "search", arguments: '{"query":"x"}' },
    });
    const toolMessages = result.filter((message) => message.role === "tool");
    expect(toolMessages).toHaveLength(1);
    expect(toolMessages[0]).toMatchObject({
      role: "tool",
      toolCallId: "call-42",
      content: '{"ok":true}',
    });
  });

  it("drops an assistant message with only a synthesized a2ui tool call", () => {
    const withoutText = toAgUiMessages([
      {
        id: "assistant-1",
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "a2ui:surface-1",
            toolName: "present",
            argsText: "{}",
            result: {},
          },
        ],
      },
    ] as any);
    const withText = toAgUiMessages([
      {
        id: "assistant-2",
        role: "assistant",
        content: [
          { type: "text", text: "Here is the surface" },
          {
            type: "tool-call",
            toolCallId: "a2ui:surface-1",
            toolName: "present",
            argsText: "{}",
            result: {},
          },
        ],
      },
    ] as any);

    expect(withoutText).toEqual([]);
    expect(withText).toEqual([
      {
        id: "assistant-2",
        role: "assistant",
        content: "Here is the surface",
      },
    ]);
  });

  it("does not serialize Host-only data when modelContent is empty", () => {
    const result = toAgUiMessages([
      {
        id: "assistant-1",
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-42",
            toolName: "show_map",
            argsText: '{"city":"sf"}',
            result: {
              content: [
                { type: "text", text: "joined text" },
                { type: "image", data: "aGk=", mimeType: "image/png" },
              ],
              structuredContent: { ok: true },
              isError: false,
            },
            modelContent: [],
          },
        ],
      },
    ] as any);

    expect(result[1]).toMatchObject({
      role: "tool",
      toolCallId: "call-42",
      content: "",
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
        content: [{ type: "text", text: "Map ready" }],
        structuredContent: { temperature: "22C" },
        _meta: { audience: "widget" },
        isError: true,
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
      result: {
        content: [{ type: "text", text: "Map ready" }],
        structuredContent: { temperature: "22C" },
        _meta: { audience: "widget" },
        isError: true,
      },
      modelContent: [{ type: "text", text: "Map ready" }],
      isError: true,
    });
  });

  it("restores requires-action status for an assistant message with an unresolved tool call", () => {
    const result = fromAgUiMessages([
      {
        id: "msg-1",
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            function: { name: "ask_user", arguments: "{}" },
          },
        ],
      },
    ] as any);

    expect(result).toHaveLength(1);
    expect((result[0] as any).status).toMatchObject({
      type: "requires-action",
      reason: "tool-calls",
    });
  });

  it("leaves a resolved tool call without a requires-action status", () => {
    const result = fromAgUiMessages([
      {
        id: "msg-1",
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            function: { name: "get_weather", arguments: "{}" },
          },
        ],
      },
      {
        id: "msg-2",
        role: "tool",
        tool_call_id: "call-1",
        content: '{"temperature":"22C"}',
      },
    ] as any);

    expect(result).toHaveLength(1);
    expect((result[0] as any).status).toBeUndefined();
  });

  it("does not add status to an assistant message without tool calls", () => {
    const result = fromAgUiMessages([
      { id: "msg-1", role: "assistant", content: "done" },
    ] as any);

    expect(result).toHaveLength(1);
    expect((result[0] as any).status).toBeUndefined();
  });

  it("restores interrupt status and metadata from a persisted interrupts blob", () => {
    const interrupts = [
      { id: "int-1", reason: "confirmation", message: "Proceed?" },
    ];
    const result = fromAgUiMessages([
      {
        id: "msg-1",
        role: "assistant",
        content: "waiting",
        metadata: { custom: { agui: { interrupts } } },
      },
    ] as any);

    expect(result).toHaveLength(1);
    expect((result[0] as any).status).toMatchObject({
      type: "requires-action",
      reason: "interrupt",
    });
    expect((result[0] as any).metadata.custom.agui.interrupts).toEqual(
      interrupts,
    );
  });

  it("prefers interrupt status over tool-calls when both are present", () => {
    const result = fromAgUiMessages([
      {
        id: "msg-1",
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            function: { name: "ask_user", arguments: "{}" },
          },
        ],
        metadata: {
          custom: {
            agui: { interrupts: [{ id: "int-1", reason: "tool_call" }] },
          },
        },
      },
    ] as any);

    expect(result).toHaveLength(1);
    expect((result[0] as any).status).toMatchObject({
      type: "requires-action",
      reason: "interrupt",
    });
  });

  it("ignores a malformed interrupts blob without throwing", () => {
    const result = fromAgUiMessages([
      {
        id: "msg-1",
        role: "assistant",
        content: "done",
        metadata: {
          custom: {
            agui: {
              interrupts: [{ reason: "no-id" }, { id: "no-reason" }, 42],
            },
          },
        },
      },
    ] as any);

    expect(result).toHaveLength(1);
    expect((result[0] as any).status).toBeUndefined();
    expect(
      (result[0] as any).metadata?.custom?.agui?.interrupts,
    ).toBeUndefined();
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

  it("imports a reasoning snapshot message as a reasoning assistant part", () => {
    const result = fromAgUiMessages([
      {
        id: "reason-1",
        role: "reasoning",
        content: "Let me think about this step by step.",
      },
    ] as any);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "reason-1",
      role: "assistant",
      content: [
        { type: "reasoning", text: "Let me think about this step by step." },
      ],
    });
  });

  it("preserves cross-message order around reasoning messages", () => {
    const result = fromAgUiMessages([
      { id: "u-1", role: "user", content: "hi" },
      { id: "r-1", role: "reasoning", content: "thinking" },
      { id: "a-1", role: "assistant", content: "done" },
    ] as any);

    expect(result.map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "assistant",
    ]);
    expect((result[1] as any).content).toEqual([
      { type: "reasoning", text: "thinking" },
    ]);
    expect((result[2] as any).content).toEqual([
      { type: "text", text: "done" },
    ]);
  });

  it("skips empty reasoning messages", () => {
    const result = fromAgUiMessages([
      { id: "r-1", role: "reasoning", content: "" },
    ] as any);

    expect(result).toHaveLength(0);
  });

  it("drops reasoning messages when showThinking is false", () => {
    const result = fromAgUiMessages(
      [
        { id: "u-1", role: "user", content: "hi" },
        { id: "r-1", role: "reasoning", content: "thinking" },
        { id: "a-1", role: "assistant", content: "done" },
      ] as any,
      { showThinking: false },
    );

    expect(result.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect((result[1] as any).content).toEqual([
      { type: "text", text: "done" },
    ]);
  });

  it("drops activity messages (no assistant-part equivalent)", () => {
    const result = fromAgUiMessages([
      { id: "u-1", role: "user", content: "hi" },
      {
        id: "act-1",
        role: "activity",
        activityType: "search",
        content: { query: "weather" },
      },
    ] as any);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ role: "user" });
  });

  it("skips whitespace-only reasoning messages", () => {
    const result = fromAgUiMessages([
      { id: "r-1", role: "reasoning", content: "   " },
    ] as any);

    expect(result).toHaveLength(0);
  });

  it("does not re-emit an imported reasoning message as an empty assistant message", () => {
    const imported = fromAgUiMessages([
      { id: "u-1", role: "user", content: "hi" },
      { id: "r-1", role: "reasoning", content: "thinking" },
      { id: "a-1", role: "assistant", content: "done" },
    ] as any);

    const roundTripped = toAgUiMessages(imported);

    expect(roundTripped.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(
      roundTripped.filter((m) => m.role === "assistant" && m.content === ""),
    ).toHaveLength(0);
    expect(roundTripped[1]).toMatchObject({
      role: "assistant",
      content: "done",
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

    expect(tools).toHaveLength(3);
    expect(tools).toEqual(
      expect.arrayContaining([
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
      ]),
    );
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

  it("converts a file part placed directly in message content", () => {
    const result = toAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [
          { type: "text", text: "review this" },
          {
            type: "file",
            data: "data:application/pdf;base64,JVBERi0xLjQ=",
            mimeType: "application/pdf",
            filename: "a.pdf",
          },
        ],
      },
    ] as any);

    expect(result[0]).toMatchObject({
      role: "user",
      content: [
        { type: "text", text: "review this" },
        {
          type: "document",
          source: {
            type: "data",
            value: "JVBERi0xLjQ=",
            mimeType: "application/pdf",
          },
          metadata: { filename: "a.pdf" },
        },
      ],
    });
    expect(() => UserMessageSchema.parse(result[0])).not.toThrow();
  });

  it("emits content and attachment file parts once each", () => {
    const result = toAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [
          {
            type: "file",
            data: "data:application/pdf;base64,QUFB",
            mimeType: "application/pdf",
            filename: "from-content.pdf",
          },
        ],
        attachments: [
          {
            id: "a-1",
            type: "document",
            name: "from-attachment.pdf",
            content: [
              {
                type: "file",
                data: "data:application/pdf;base64,QkJC",
                mimeType: "application/pdf",
                filename: "from-attachment.pdf",
              },
            ],
          },
        ],
      },
    ] as any);

    const documents = (result[0] as any).content.filter(
      (part: any) => part.type === "document",
    );
    expect(documents).toHaveLength(2);
    expect(documents.map((part: any) => part.source.value)).toEqual([
      "QUFB",
      "QkJC",
    ]);
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

  it("converts a file attachment to an AG-UI document part with filename in metadata", () => {
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
          type: "document",
          source: {
            type: "data",
            value: "JVBERi0xLjQK",
            mimeType: "application/pdf",
          },
          metadata: { filename: "spec.pdf" },
        },
      ],
    });
    expect((result[0] as any).content[1]).not.toHaveProperty("filename");
    expect(() => UserMessageSchema.parse(result[0])).not.toThrow();
  });

  it("classifies audio/video files into their own multimodal parts", () => {
    const result = toAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [],
        attachments: [
          {
            id: "a-1",
            type: "file",
            name: "clip.mp3",
            content: [
              {
                type: "file",
                data: "data:audio/mpeg;base64,QUJD",
                mimeType: "audio/mpeg",
              },
            ],
          },
          {
            id: "a-2",
            type: "file",
            name: "clip.mp4",
            content: [
              {
                type: "file",
                data: "ZmFrZQ==",
                mimeType: "video/mp4",
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
          type: "audio",
          source: { type: "data", value: "QUJD", mimeType: "audio/mpeg" },
        },
        {
          type: "video",
          source: { type: "data", value: "ZmFrZQ==", mimeType: "video/mp4" },
        },
      ],
    });
    expect(() => UserMessageSchema.parse(result[0])).not.toThrow();
  });

  it("converts an http(s) file attachment to a url source document part", () => {
    const result = toAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [],
        attachments: [
          {
            id: "a-1",
            type: "document",
            name: "spec.pdf",
            contentType: "application/pdf",
            content: [
              {
                type: "file",
                data: "https://example.com/spec.pdf",
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
        {
          type: "document",
          source: {
            type: "url",
            value: "https://example.com/spec.pdf",
            mimeType: "application/pdf",
          },
          metadata: { filename: "spec.pdf" },
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

  it("routes http file data to a url source, not an inline data source", () => {
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
          type: "document",
          source: {
            type: "url",
            value: "https://cdn.example.com/report.pdf",
            mimeType: "application/pdf",
          },
          metadata: { filename: "report.pdf" },
        },
      ],
    });
    expect((result[0] as any).content[0].source).not.toHaveProperty("data");
    expect(() => UserMessageSchema.parse(result[0])).not.toThrow();
  });

  it("honors sourceType url for non-http file references", () => {
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
                data: "s3://bucket/report.pdf",
                mimeType: "application/pdf",
                filename: "report.pdf",
                sourceType: "url",
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
          type: "document",
          source: {
            type: "url",
            value: "s3://bucket/report.pdf",
            mimeType: "application/pdf",
          },
          metadata: { filename: "report.pdf" },
        },
      ],
    });
    expect((result[0] as any).content[0].source).not.toHaveProperty("data");
    expect(() => UserMessageSchema.parse(result[0])).not.toThrow();
  });

  it("routes non-http file references to a data source without sourceType", () => {
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
                data: "s3://bucket/report.pdf",
                mimeType: "application/pdf",
              },
            ],
          },
        ],
      },
    ] as any);

    expect((result[0] as any).content[0].source).toMatchObject({
      type: "data",
      value: "s3://bucket/report.pdf",
    });
  });

  it("stamps sourceType url on restored url file parts so they round-trip", () => {
    const restored = fromAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "url",
              value: "s3://bucket/spec.pdf",
              mimeType: "application/pdf",
            },
            metadata: { filename: "spec.pdf" },
          },
        ],
      },
    ]);

    expect(restored[0]).toMatchObject({
      role: "user",
      attachments: [
        {
          type: "document",
          content: [
            {
              type: "file",
              data: "s3://bucket/spec.pdf",
              mimeType: "application/pdf",
              sourceType: "url",
            },
          ],
        },
      ],
    });

    const resent = toAgUiMessages([restored[0]] as any);
    expect((resent[0] as any).content[0].source).toMatchObject({
      type: "url",
      value: "s3://bucket/spec.pdf",
    });
  });

  it("restores a document input part as a user attachment", () => {
    const result = fromAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [
          { type: "text", text: "review this" },
          {
            type: "document",
            source: {
              type: "url",
              value: "https://example.com/spec.pdf",
              mimeType: "application/pdf",
            },
            metadata: { filename: "spec.pdf" },
          },
        ],
      },
    ]);

    expect(result[0]).toMatchObject({
      role: "user",
      content: "review this",
      attachments: [
        {
          type: "document",
          name: "spec.pdf",
          contentType: "application/pdf",
          status: { type: "complete" },
          content: [
            {
              type: "file",
              data: "https://example.com/spec.pdf",
              mimeType: "application/pdf",
              filename: "spec.pdf",
            },
          ],
        },
      ],
    });
  });

  it("restores an image input part with a data source as an image attachment", () => {
    const result = fromAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "data",
              value: "iVBORw0KGgo=",
              mimeType: "image/png",
            },
          },
        ],
      },
    ]);

    expect(result[0]).toMatchObject({
      role: "user",
      content: "",
      attachments: [
        {
          type: "image",
          name: "image",
          contentType: "image/png",
          status: { type: "complete" },
          content: [
            { type: "image", image: "data:image/png;base64,iVBORw0KGgo=" },
          ],
        },
      ],
    });
  });

  it("restores audio and video input parts as file attachments", () => {
    const result = fromAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [
          {
            type: "audio",
            source: { type: "data", value: "QUJD", mimeType: "audio/mpeg" },
            metadata: { filename: "memo.mp3" },
          },
          {
            type: "video",
            source: {
              type: "url",
              value: "https://example.com/clip.mp4",
              mimeType: "video/mp4",
            },
          },
        ],
      },
    ]);

    expect(result[0]!.attachments).toMatchObject([
      {
        type: "file",
        name: "memo.mp3",
        contentType: "audio/mpeg",
        content: [
          {
            type: "file",
            data: "data:audio/mpeg;base64,QUJD",
            mimeType: "audio/mpeg",
            filename: "memo.mp3",
          },
        ],
      },
      {
        type: "file",
        name: "file",
        contentType: "video/mp4",
        content: [
          {
            type: "file",
            data: "https://example.com/clip.mp4",
            mimeType: "video/mp4",
          },
        ],
      },
    ]);
  });

  it("does not add attachments to text-only user messages", () => {
    const result = fromAgUiMessages([
      { id: "u-1", role: "user", content: "Hi" },
      {
        id: "u-2",
        role: "user",
        content: [{ type: "text", text: "Hello" }],
      },
    ]);

    expect(result[0]).not.toHaveProperty("attachments");
    expect(result[1]).not.toHaveProperty("attachments");
  });

  it("round-trips multimodal user input through fromAgUiMessages and back", () => {
    const original = {
      id: "u-1",
      role: "user",
      content: [
        { type: "text", text: "see attached" },
        {
          type: "document",
          source: {
            type: "data",
            value: "JVBERi0xLjQK",
            mimeType: "application/pdf",
          },
          metadata: { filename: "spec.pdf" },
        },
      ],
    };

    const restored = fromAgUiMessages([original]);
    const roundTripped = toAgUiMessages(
      restored as Parameters<typeof toAgUiMessages>[0],
    );

    expect(roundTripped[0]).toMatchObject({
      role: "user",
      content: [
        { type: "text", text: "see attached" },
        {
          type: "document",
          source: {
            type: "data",
            value: "JVBERi0xLjQK",
            mimeType: "application/pdf",
          },
          metadata: { filename: "spec.pdf" },
        },
      ],
    });
    expect(() => UserMessageSchema.parse(roundTripped[0])).not.toThrow();
  });

  it("converts a native audio content part to an AG-UI audio source", () => {
    const result = toAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [
          { type: "text", text: "listen to this" },
          { type: "audio", audio: { data: "QUJD", format: "mp3" } },
        ],
      },
    ] as any);

    expect(result[0]).toMatchObject({
      role: "user",
      content: [
        { type: "text", text: "listen to this" },
        {
          type: "audio",
          source: { type: "data", value: "QUJD", mimeType: "audio/mp3" },
        },
      ],
    });
    expect(() => UserMessageSchema.parse(result[0])).not.toThrow();
  });

  it("derives the audio mime type from the wav format", () => {
    const result = toAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [{ type: "audio", audio: { data: "QUJD", format: "wav" } }],
      },
    ] as any);

    expect(result[0]!.content).toMatchObject([
      {
        type: "audio",
        source: { type: "data", value: "QUJD", mimeType: "audio/wav" },
      },
    ]);
  });

  it("strips a data URL envelope from audio data and keeps the format-derived mime type", () => {
    const result = toAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [
          {
            type: "audio",
            audio: { data: "data:audio/mpeg;base64,QUJD", format: "mp3" },
          },
        ],
      },
    ] as any);

    expect(result[0]!.content).toMatchObject([
      {
        type: "audio",
        source: { type: "data", value: "QUJD", mimeType: "audio/mp3" },
      },
    ]);
  });

  it("drops an audio part with a malformed payload without failing the send", () => {
    const result = toAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [
          { type: "text", text: "hi" },
          { type: "audio", audio: { format: "mp3" } },
        ],
      },
    ] as any);

    expect(result[0]).toMatchObject({ role: "user", content: "hi" });
    expect(() => UserMessageSchema.parse(result[0])).not.toThrow();
  });

  it("drops data parts while keeping surrounding text", () => {
    const result = toAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [
          { type: "text", text: "hi" },
          { type: "data", name: "chart", data: { x: 1 } },
        ],
      },
    ] as any);

    expect(result[0]).toMatchObject({ role: "user", content: "hi" });
    expect(() => UserMessageSchema.parse(result[0])).not.toThrow();
  });

  it("round-trips a native audio part through the attachment channel back to a wire audio block", () => {
    const sent = toAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [{ type: "audio", audio: { data: "QUJD", format: "mp3" } }],
      },
    ] as any);

    const restored = fromAgUiMessages(sent);
    const resent = toAgUiMessages(
      restored as Parameters<typeof toAgUiMessages>[0],
    );

    expect(resent[0]!.content).toMatchObject([
      {
        type: "audio",
        source: { type: "data", value: "QUJD", mimeType: "audio/mp3" },
      },
    ]);
    expect(() => UserMessageSchema.parse(resent[0])).not.toThrow();
  });

  it("restores a legacy binary input part and re-sends it as a modern part", () => {
    const restored = fromAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [
          { type: "text", text: "old history" },
          {
            type: "binary",
            mimeType: "application/pdf",
            data: "JVBERi0xLjQK",
            filename: "legacy.pdf",
          },
        ],
      },
    ]);

    expect(restored[0]).toMatchObject({
      role: "user",
      content: "old history",
      attachments: [
        {
          type: "document",
          name: "legacy.pdf",
          contentType: "application/pdf",
          status: { type: "complete" },
          content: [
            {
              type: "file",
              data: "data:application/pdf;base64,JVBERi0xLjQK",
              mimeType: "application/pdf",
              filename: "legacy.pdf",
            },
          ],
        },
      ],
    });

    const roundTripped = toAgUiMessages(
      restored as Parameters<typeof toAgUiMessages>[0],
    );
    expect(roundTripped[0]).toMatchObject({
      role: "user",
      content: [
        { type: "text", text: "old history" },
        {
          type: "document",
          source: {
            type: "data",
            value: "JVBERi0xLjQK",
            mimeType: "application/pdf",
          },
          metadata: { filename: "legacy.pdf" },
        },
      ],
    });
    expect(() => UserMessageSchema.parse(roundTripped[0])).not.toThrow();
  });

  it("restores a legacy binary image part with a url as an image attachment", () => {
    const result = fromAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [
          {
            type: "binary",
            mimeType: "image/png",
            url: "https://example.com/cat.png",
          },
        ],
      },
    ]);

    expect(result[0]).toMatchObject({
      role: "user",
      content: "",
      attachments: [
        {
          type: "image",
          name: "image",
          contentType: "image/png",
          status: { type: "complete" },
          content: [{ type: "image", image: "https://example.com/cat.png" }],
        },
      ],
    });
  });

  it("prefers data over url in legacy binary parts and routes them by mime type", () => {
    const result = fromAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [
          {
            type: "binary",
            mimeType: "audio/mpeg",
            data: "QUJD",
            url: "https://example.com/memo.mp3",
          },
          {
            type: "binary",
            mimeType: "video/mp4",
            data: "",
            url: "https://example.com/clip.mp4",
          },
        ],
      },
    ]);

    expect(result[0]!.attachments).toMatchObject([
      {
        type: "file",
        contentType: "audio/mpeg",
        content: [
          {
            type: "file",
            data: "data:audio/mpeg;base64,QUJD",
            mimeType: "audio/mpeg",
          },
        ],
      },
      {
        type: "file",
        contentType: "video/mp4",
        content: [
          {
            type: "file",
            data: "https://example.com/clip.mp4",
            mimeType: "video/mp4",
          },
        ],
      },
    ]);
  });

  it("skips legacy binary parts that only carry a file id", () => {
    const result = fromAgUiMessages([
      {
        id: "u-1",
        role: "user",
        content: [
          { type: "text", text: "see file" },
          { type: "binary", mimeType: "application/pdf", id: "file-1" },
        ],
      },
    ]);

    expect(result[0]).toMatchObject({ role: "user", content: "see file" });
    expect(result[0]).not.toHaveProperty("attachments");
  });
});

describe("mcp app rehydration from restored tool messages", () => {
  it("rehydrates mcp.app from the _meta ui/resourceUri carrier", () => {
    const result = fromAgUiMessages([
      {
        id: "a-1",
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            function: { name: "search", arguments: "{}" },
          },
        ],
      },
      {
        id: "t-1",
        role: "tool",
        tool_call_id: "call-1",
        content: "ok",
        _meta: { "ui/resourceUri": "ui://example/search" },
      },
    ] as any);

    const part = (result[0] as any).content.find(
      (p: { type: string }) => p.type === "tool-call",
    );
    expect(part.mcp).toEqual({ app: { resourceUri: "ui://example/search" } });
  });

  it("rehydrates mcp.app from the nested _meta ui.resourceUri carrier", () => {
    const result = fromAgUiMessages([
      {
        id: "a-1",
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            function: { name: "search", arguments: "{}" },
          },
        ],
      },
      {
        id: "t-1",
        role: "tool",
        tool_call_id: "call-1",
        content: "ok",
        _meta: { ui: { resourceUri: "ui://example/search" } },
      },
    ] as any);

    const part = (result[0] as any).content.find(
      (p: { type: string }) => p.type === "tool-call",
    );
    expect(part.mcp).toEqual({ app: { resourceUri: "ui://example/search" } });
  });

  it("prefers the nested _meta ui.resourceUri carrier over the flat carrier", () => {
    const result = fromAgUiMessages([
      {
        id: "a-1",
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            function: { name: "search", arguments: "{}" },
          },
        ],
      },
      {
        id: "t-1",
        role: "tool",
        tool_call_id: "call-1",
        content: "ok",
        _meta: {
          ui: { resourceUri: "ui://example/nested" },
          "ui/resourceUri": "ui://example/flat",
        },
      },
    ] as any);

    const part = (result[0] as any).content.find(
      (p: { type: string }) => p.type === "tool-call",
    );
    expect(part.mcp).toEqual({ app: { resourceUri: "ui://example/nested" } });
  });

  it("falls back to the flat carrier when the nested resourceUri is not a ui:// app uri", () => {
    const result = fromAgUiMessages([
      {
        id: "a-1",
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            function: { name: "search", arguments: "{}" },
          },
        ],
      },
      {
        id: "t-1",
        role: "tool",
        tool_call_id: "call-1",
        content: "ok",
        _meta: {
          ui: { resourceUri: "https://example.com/not-an-app" },
          "ui/resourceUri": "ui://example/flat",
        },
      },
    ] as any);

    const part = (result[0] as any).content.find(
      (p: { type: string }) => p.type === "tool-call",
    );
    expect(part.mcp).toEqual({ app: { resourceUri: "ui://example/flat" } });
  });

  it("rehydrates mcp.app on a synthetic assistant tool-call for an orphan tool message", () => {
    const result = fromAgUiMessages([
      {
        id: "t-1",
        role: "tool",
        tool_call_id: "call-9",
        name: "lookup",
        content: '{"ok":true}',
        _meta: { "ui/resourceUri": "ui://example/lookup" },
      },
    ] as any);

    expect((result[0] as any).content[0].mcp).toEqual({
      app: { resourceUri: "ui://example/lookup" },
    });
  });

  it("does not set mcp.app when the carrier resourceUri is not a ui:// app uri", () => {
    const result = fromAgUiMessages([
      {
        id: "a-1",
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            function: { name: "search", arguments: "{}" },
          },
        ],
      },
      {
        id: "t-1",
        role: "tool",
        tool_call_id: "call-1",
        content: "ok",
        _meta: { "ui/resourceUri": "https://example.com/not-an-app" },
      },
    ] as any);

    const part = (result[0] as any).content.find(
      (p: { type: string }) => p.type === "tool-call",
    );
    expect(part.mcp).toBeUndefined();
  });

  it("leaves mcp unset on a restored part without a carrier", () => {
    const result = fromAgUiMessages([
      {
        id: "a-2",
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call-2",
            type: "function",
            function: { name: "search", arguments: "{}" },
          },
        ],
      },
      { id: "t-2", role: "tool", tool_call_id: "call-2", content: "ok" },
    ] as any);

    const part = (result[0] as any).content.find(
      (p: { type: string }) => p.type === "tool-call",
    );
    expect(part.mcp).toBeUndefined();
  });
});

describe("a2ui surface rehydration from restored activity messages", () => {
  const a2uiSurfaceOperations = (surfaceId: string, title: string) => [
    { version: "v0.9", createSurface: { surfaceId } },
    {
      version: "v0.9",
      updateComponents: {
        surfaceId,
        components: [
          { id: "root", component: "Column", children: ["heading", "body"] },
          {
            id: "heading",
            component: "Text",
            variant: "h1",
            text: { path: "/title" },
          },
          { id: "body", component: "Text", text: { path: "/body" } },
        ],
      },
    },
    {
      version: "v0.9",
      updateDataModel: { surfaceId, data: { title, body: `${title} body` } },
    },
  ];

  const findA2uiPart = (message: any) =>
    message.content.find(
      (p: { type: string; toolCallId?: string }) =>
        p.type === "tool-call" && p.toolCallId?.startsWith("a2ui:"),
    );

  const expectSurfacePart = (part: any, surfaceId: string, title: string) => {
    expect(part).toMatchObject({
      type: "tool-call",
      toolCallId: `a2ui:${surfaceId}`,
      toolName: "present",
      args: {
        $type: "Col",
        children: [
          { $type: "Header", text: title },
          { $type: "Markdown", value: `${title} body` },
        ],
      },
    });
    expect(part.result).toEqual({});
    expect(part.argsText).toBe(JSON.stringify(part.args));
  };

  it("rehydrates an a2ui surface onto the preceding assistant message", () => {
    const result = fromAgUiMessages([
      { id: "u-1", role: "user", content: "show me a dashboard" },
      { id: "a-1", role: "assistant", content: "Here is the dashboard" },
      {
        id: "act-1",
        role: "activity",
        activityType: "a2ui-surface",
        content: {
          a2ui_operations: a2uiSurfaceOperations("surface-1", "Welcome"),
        },
      },
    ] as any);

    expect(result.map((m) => m.role)).toEqual(["user", "assistant"]);
    const assistant = result[1] as any;
    expectSurfacePart(findA2uiPart(assistant), "surface-1", "Welcome");
    expect(
      assistant.content.find((p: { type: string }) => p.type === "text").text,
    ).toBe("Here is the dashboard");
  });

  it("preserves existing tool calls and text alongside the rehydrated a2ui part", () => {
    const result = fromAgUiMessages([
      {
        id: "a-1",
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            function: { name: "search", arguments: "{}" },
          },
        ],
      },
      {
        id: "act-1",
        role: "activity",
        activityType: "a2ui-surface",
        content: {
          a2ui_operations: a2uiSurfaceOperations("surface-1", "Welcome"),
        },
      },
    ] as any);

    const assistant = result[0] as any;
    const toolCallIds = assistant.content
      .filter((p: { type: string }) => p.type === "tool-call")
      .map((p: { toolCallId: string }) => p.toolCallId);
    expect(toolCallIds).toEqual(["call-1", "a2ui:surface-1"]);
  });

  it("rehydrates multiple surfaces from one snapshot", () => {
    const result = fromAgUiMessages([
      { id: "a-1", role: "assistant", content: "ok" },
      {
        id: "act-1",
        role: "activity",
        activityType: "a2ui-surface",
        content: {
          a2ui_operations: [
            ...a2uiSurfaceOperations("s-1", "First"),
            ...a2uiSurfaceOperations("s-2", "Second"),
          ],
        },
      },
    ] as any);

    const assistant = result[0] as any;
    const a2uiIds = assistant.content
      .filter((p: { type: string; toolCallId?: string }) =>
        p.toolCallId?.startsWith("a2ui:"),
      )
      .map((p: { toolCallId: string }) => p.toolCallId);
    expect(a2uiIds).toEqual(["a2ui:s-1", "a2ui:s-2"]);
  });

  it("replaces the rehydrated surface when a later snapshot targets the same owner", () => {
    const result = fromAgUiMessages([
      { id: "a-1", role: "assistant", content: "ok" },
      {
        id: "act-1",
        role: "activity",
        activityType: "a2ui-surface",
        content: {
          a2ui_operations: a2uiSurfaceOperations("surface-1", "Original"),
        },
      },
      {
        id: "act-2",
        role: "activity",
        activityType: "a2ui-surface",
        content: {
          replace: true,
          a2ui_operations: [
            { version: "v0.9", createSurface: { surfaceId: "surface-1" } },
            {
              version: "v0.9",
              updateComponents: {
                surfaceId: "surface-1",
                components: [
                  { id: "root", component: "Text", text: "Replacement" },
                ],
              },
            },
          ],
        },
      },
    ] as any);

    const assistant = result[0] as any;
    const a2uiParts = assistant.content.filter((p: any) =>
      p.toolCallId?.startsWith("a2ui:"),
    );
    expect(a2uiParts).toHaveLength(1);
    expect(a2uiParts[0].args).toEqual({
      $type: "Markdown",
      value: "Replacement",
    });
  });

  it("keeps every surface when each arrives as its own activity message", () => {
    const result = fromAgUiMessages([
      { id: "a-1", role: "assistant", content: "ok" },
      {
        id: "a2ui-surface-s-1-call_9",
        role: "activity",
        activityType: "a2ui-surface",
        content: {
          a2ui_operations: a2uiSurfaceOperations("s-1", "First"),
        },
      },
      {
        id: "a2ui-surface-s-2-call_9",
        role: "activity",
        activityType: "a2ui-surface",
        content: {
          a2ui_operations: a2uiSurfaceOperations("s-2", "Second"),
        },
      },
    ] as any);

    const a2uiParts = (result[0] as any).content.filter((part: any) =>
      part.toolCallId?.startsWith("a2ui:"),
    );
    expect(a2uiParts.map((part: any) => part.toolCallId)).toEqual([
      "a2ui:s-1",
      "a2ui:s-2",
    ]);
    expectSurfacePart(a2uiParts[0], "s-1", "First");
    expectSurfacePart(a2uiParts[1], "s-2", "Second");
  });

  it("overwrites a surface when a later activity message reuses the same id", () => {
    const result = fromAgUiMessages([
      { id: "a-1", role: "assistant", content: "ok" },
      {
        id: "a2ui-surface-s-1-call_9",
        role: "activity",
        activityType: "a2ui-surface",
        content: {
          a2ui_operations: a2uiSurfaceOperations("s-1", "First"),
        },
      },
      {
        id: "a2ui-surface-s-1-call_9",
        role: "activity",
        activityType: "a2ui-surface",
        content: {
          a2ui_operations: a2uiSurfaceOperations("s-1", "Second"),
        },
      },
    ] as any);

    const a2uiParts = (result[0] as any).content.filter((part: any) =>
      part.toolCallId?.startsWith("a2ui:"),
    );
    expect(a2uiParts).toHaveLength(1);
    expectSurfacePart(a2uiParts[0], "s-1", "Second");
  });

  it("removes a surface when the same activity id is re-materialized without it", () => {
    const result = fromAgUiMessages([
      { id: "a-1", role: "assistant", content: "ok" },
      {
        id: "a2ui-surface-s-1-call_9",
        role: "activity",
        activityType: "a2ui-surface",
        content: {
          a2ui_operations: [
            ...a2uiSurfaceOperations("s-1", "First"),
            ...a2uiSurfaceOperations("s-2", "Second"),
          ],
        },
      },
      {
        id: "a2ui-surface-s-1-call_9",
        role: "activity",
        activityType: "a2ui-surface",
        content: {
          a2ui_operations: a2uiSurfaceOperations("s-2", "Second"),
        },
      },
    ] as any);

    const a2uiParts = (result[0] as any).content.filter((part: any) =>
      part.toolCallId?.startsWith("a2ui:"),
    );
    expect(a2uiParts).toHaveLength(1);
    expectSurfacePart(a2uiParts[0], "s-2", "Second");
  });

  it("drops an a2ui activity with no owning assistant message", () => {
    const result = fromAgUiMessages([
      { id: "u-1", role: "user", content: "hi" },
      {
        id: "act-1",
        role: "activity",
        activityType: "a2ui-surface",
        content: {
          a2ui_operations: a2uiSurfaceOperations("surface-1", "Welcome"),
        },
      },
    ] as any);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ role: "user" });
  });

  it("drops a non-a2ui activity type", () => {
    const result = fromAgUiMessages([
      { id: "a-1", role: "assistant", content: "ok" },
      {
        id: "act-1",
        role: "activity",
        activityType: "search",
        content: { query: "weather" },
      },
    ] as any);

    expect((result[0] as any).content).toEqual([{ type: "text", text: "ok" }]);
  });

  it("ignores an a2ui activity whose content has no a2ui_operations", () => {
    const result = fromAgUiMessages([
      { id: "a-1", role: "assistant", content: "ok" },
      {
        id: "act-1",
        role: "activity",
        activityType: "a2ui-surface",
        content: { status: "building" },
      },
    ] as any);

    expect((result[0] as any).content).toEqual([{ type: "text", text: "ok" }]);
  });
});

describe("package exports", () => {
  it("exposes fromAgUiMessages from the package root", () => {
    expect(publicFromAgUiMessages).toBe(fromAgUiMessages);
  });

  it("composes with ExportedMessageRepository.fromArray for history loading", () => {
    const repo = ExportedMessageRepository.fromArray(
      publicFromAgUiMessages([
        { id: "u-1", role: "user", content: "Hi" },
        { id: "a-1", role: "assistant", content: "Hello!" },
      ]),
    );

    expect(repo.messages).toHaveLength(2);
    expect(repo.messages[0]).toMatchObject({
      parentId: null,
      message: { role: "user" },
    });
    expect(repo.messages[1]!.parentId).toBe(repo.messages[0]!.message.id);
  });
});

"use client";

import { describe, it, expect } from "vitest";
import {
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
});

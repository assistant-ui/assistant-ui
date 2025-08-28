import { describe, it, expect } from "vitest";
import { convertLangChainMessages } from "./convertLangChainMessages";
import { LangChainMessage } from "./types";

describe("convertLangChainMessages", () => {
  it("converts system messages", () => {
    const message: LangChainMessage = { type: "system", content: "hello", id: "s1" };
    const result = convertLangChainMessages(message);
    expect(result).toEqual({ role: "system", id: "s1", content: [{ type: "text", text: "hello" }] });
  });

  it("converts human messages with rich content", () => {
    const message: LangChainMessage = {
      type: "human",
      id: "h1",
      content: [
        { type: "text", text: "hi" },
        { type: "image_url", image_url: { url: "http://img" } },
      ],
    };
    const result = convertLangChainMessages(message);
    expect(result).toEqual({
      role: "user",
      id: "h1",
      content: [
        { type: "text", text: "hi" },
        { type: "image", image: "http://img" },
      ],
    });
  });

  it("converts ai messages with tool calls", () => {
    const message: LangChainMessage = {
      type: "ai",
      id: "a1",
      content: [{ type: "text", text: "response" }],
      tool_calls: [
        {
          id: "t1",
          name: "myTool",
          argsText: "{\"foo\":1}",
          args: { foo: 1 },
        },
      ],
      tool_call_chunks: [
        { index: 0, id: "t1", name: "myTool", args: "{\"foo\":1}" },
      ],
    };
    const result = convertLangChainMessages(message);
    expect(result).toEqual({
      role: "assistant",
      id: "a1",
      content: [
        { type: "text", text: "response" },
        {
          type: "tool-call",
          toolCallId: "t1",
          toolName: "myTool",
          args: { foo: 1 },
          argsText: "{\"foo\":1}",
        },
      ],
    });
  });

  it("converts tool messages", () => {
    const message: LangChainMessage = {
      type: "tool",
      id: "tool1",
      content: "done",
      tool_call_id: "c1",
      name: "do",
      artifact: { a: 1 },
      status: "error",
    };
    const result = convertLangChainMessages(message);
    expect(result).toEqual({
      role: "tool",
      toolName: "do",
      toolCallId: "c1",
      result: "done",
      artifact: { a: 1 },
      isError: true,
    });
  });
});

import { describe, it, expect } from "vitest";
import { convertAdkMessage } from "./convertAdkMessages";
import type { AdkMessage } from "./types";

describe("convertAdkMessage - human messages", () => {
  it("converts a human message with string content to user role", () => {
    const msg: AdkMessage = { id: "m1", type: "human", content: "Hello" };
    const result = convertAdkMessage(msg);
    expect(result).toMatchObject({
      role: "user",
      id: "m1",
      content: [{ type: "text", text: "Hello" }],
    });
  });

  it("converts a human message with text content parts", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "human",
      content: [{ type: "text", text: "Hello" }],
    };
    const result = convertAdkMessage(msg);
    expect(result).toMatchObject({
      role: "user",
      content: [{ type: "text", text: "Hello" }],
    });
  });
});

describe("convertAdkMessage - ai messages", () => {
  it("converts an ai message with text content", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "ai",
      content: [{ type: "text", text: "Hi there" }],
    };
    const result = convertAdkMessage(msg);
    expect(result).toMatchObject({
      role: "assistant",
      id: "m1",
      content: [{ type: "text", text: "Hi there" }],
    });
  });

  it("converts reasoning content parts", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "ai",
      content: [{ type: "reasoning", text: "Let me think..." }],
    };
    const result = convertAdkMessage(msg);
    expect(result).toMatchObject({
      content: [{ type: "reasoning", text: "Let me think..." }],
    });
  });

  it("converts image content parts to data URI", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "ai",
      content: [{ type: "image", mimeType: "image/png", data: "abc123" }],
    };
    const result = convertAdkMessage(msg);
    expect(result).toMatchObject({
      content: [{ type: "image", image: "data:image/png;base64,abc123" }],
    });
  });

  it("converts image_url content parts", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "ai",
      content: [{ type: "image_url", url: "https://example.com/img.png" }],
    };
    const result = convertAdkMessage(msg);
    expect(result).toMatchObject({
      content: [{ type: "image", image: "https://example.com/img.png" }],
    });
  });

  it("converts code content parts to data parts", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "ai",
      content: [{ type: "code", code: "print(1)", language: "python" }],
    };
    const result = convertAdkMessage(msg);
    expect(result).toMatchObject({
      content: [
        {
          type: "data",
          name: "executable_code",
          data: { code: "print(1)", language: "python" },
        },
      ],
    });
  });

  it("converts code_result content parts to data parts", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "ai",
      content: [{ type: "code_result", output: "1", outcome: "OUTCOME_OK" }],
    };
    const result = convertAdkMessage(msg);
    expect(result).toMatchObject({
      content: [
        {
          type: "data",
          name: "code_execution_result",
          data: { output: "1", outcome: "OUTCOME_OK" },
        },
      ],
    });
  });

  it("converts tool_calls to tool-call content parts", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "ai",
      content: [],
      tool_calls: [{ id: "tc-1", name: "search", args: { q: "test" } }],
    };
    const result = convertAdkMessage(msg);
    expect(result).toMatchObject({
      content: [
        {
          type: "tool-call",
          toolCallId: "tc-1",
          toolName: "search",
          args: { q: "test" },
        },
      ],
    });
  });

  it("includes status when present", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "ai",
      content: [{ type: "text", text: "done" }],
      status: { type: "complete", reason: "stop" },
    };
    const result = convertAdkMessage(msg);
    expect(result).toMatchObject({
      status: { type: "complete", reason: "stop" },
    });
  });

  it("includes author/branch metadata when author is set", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "ai",
      content: [{ type: "text", text: "hi" }],
      author: "search_agent",
      branch: "root.search_agent",
    };
    const result = convertAdkMessage(msg);
    expect(result).toMatchObject({
      metadata: {
        custom: { author: "search_agent", branch: "root.search_agent" },
      },
    });
  });

  it("omits metadata when author is not set", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "ai",
      content: [{ type: "text", text: "hi" }],
    };
    const result = convertAdkMessage(msg);
    expect(result).not.toHaveProperty("metadata");
  });
});

describe("convertAdkMessage - tool messages", () => {
  it("converts a tool message to tool role", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "tool",
      tool_call_id: "tc-1",
      name: "search",
      content: '{"results":[]}',
      status: "success",
    };
    const result = convertAdkMessage(msg);
    expect(result).toMatchObject({
      role: "tool",
      toolCallId: "tc-1",
      toolName: "search",
      result: '{"results":[]}',
      isError: false,
    });
  });

  it("sets isError to true when status is error", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "tool",
      tool_call_id: "tc-1",
      name: "search",
      content: "Failed",
      status: "error",
    };
    const result = convertAdkMessage(msg);
    expect(result).toMatchObject({ isError: true });
  });
});

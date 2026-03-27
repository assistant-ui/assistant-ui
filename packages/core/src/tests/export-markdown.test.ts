import { describe, it, expect } from "vitest";
import { toMarkdown } from "../share/export-markdown";
import type { ThreadMessage } from "../types/message";

const user = (text: string): ThreadMessage =>
  ({
    id: `u-${Math.random()}`,
    role: "user",
    createdAt: new Date(),
    content: [{ type: "text", text }],
    attachments: [],
    metadata: { custom: {} },
  }) as ThreadMessage;

const assistant = (text: string): ThreadMessage =>
  ({
    id: `a-${Math.random()}`,
    role: "assistant",
    createdAt: new Date(),
    content: [{ type: "text", text }],
    status: { type: "complete", reason: "stop" },
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
  }) as ThreadMessage;

describe("toMarkdown", () => {
  it("formats user and assistant messages", () => {
    const result = toMarkdown([user("Hello"), assistant("Hi there")]);
    expect(result).toContain("**User:**");
    expect(result).toContain("Hello");
    expect(result).toContain("**Assistant:**");
    expect(result).toContain("Hi there");
  });

  it("handles tool call parts", () => {
    const msg = {
      id: "a-1",
      role: "assistant",
      createdAt: new Date(),
      content: [
        {
          type: "tool-call",
          toolCallId: "tc-1",
          toolName: "search",
          args: { query: "test" },
          argsText: '{"query":"test"}',
        },
      ],
      status: { type: "complete", reason: "stop" },
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
    } as ThreadMessage;
    const result = toMarkdown([msg]);
    expect(result).toContain("search");
  });

  it("handles reasoning parts", () => {
    const msg = {
      id: "a-1",
      role: "assistant",
      createdAt: new Date(),
      content: [
        { type: "reasoning", text: "thinking about it" },
        { type: "text", text: "Here is my answer" },
      ],
      status: { type: "complete", reason: "stop" },
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
    } as ThreadMessage;
    const result = toMarkdown([msg]);
    expect(result).toContain("thinking about it");
    expect(result).toContain("Here is my answer");
  });

  it("handles system messages", () => {
    const msg = {
      id: "s-1",
      role: "system",
      createdAt: new Date(),
      content: [{ type: "text", text: "You are helpful" }],
      metadata: { custom: {} },
    } as ThreadMessage;
    const result = toMarkdown([msg]);
    expect(result).toContain("**System:**");
    expect(result).toContain("You are helpful");
  });

  it("handles empty messages array", () => {
    expect(toMarkdown([])).toBe("");
  });

  it("handles source parts", () => {
    const msg = {
      id: "a-1",
      role: "assistant",
      createdAt: new Date(),
      content: [
        { type: "text", text: "According to sources" },
        {
          type: "source",
          id: "s-1",
          title: "Wikipedia",
          url: "https://en.wikipedia.org",
          sourceType: "url",
        },
      ],
      status: { type: "complete", reason: "stop" },
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
    } as ThreadMessage;
    const result = toMarkdown([msg]);
    expect(result).toContain("Wikipedia");
    expect(result).toContain("https://en.wikipedia.org");
  });

  it("renders file parts using the serialized filename field", () => {
    const msg = {
      id: "u-1",
      role: "user",
      createdAt: new Date(),
      content: [{ type: "file", filename: "notes.txt" }],
      attachments: [],
      metadata: { custom: {} },
    } as ThreadMessage;

    const result = toMarkdown([msg]);
    expect(result).toContain("[file: notes.txt]");
  });
});

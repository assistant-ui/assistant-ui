import type { ThreadMessage } from "@assistant-ui/core";
import { describe, expect, it } from "vitest";
import { toLanguageModelMessages } from "./toLanguageModelMessages";

const createFileMessage = (data: string): ThreadMessage => ({
  id: "user-1",
  role: "user",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  content: [{ type: "file", data, mimeType: "text/plain" }],
  attachments: [],
  metadata: { custom: {} },
});

const convertFileData = (data: string) => {
  const [message] = toLanguageModelMessages([createFileMessage(data)]);
  if (message?.role !== "user") throw new Error("Expected a user message");

  const [part] = message.content;
  if (part?.type !== "file") throw new Error("Expected a file part");

  return part.data;
};

describe("toLanguageModelMessages", () => {
  it("preserves IDs when an earlier message produces no model message", () => {
    const messages: ThreadMessage[] = [
      {
        id: "empty-user",
        role: "user",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        content: [],
        attachments: [],
        metadata: { custom: {} },
      },
      {
        id: "visible-user",
        role: "user",
        createdAt: new Date("2026-01-01T00:00:01.000Z"),
        content: [{ type: "text", text: "hello" }],
        attachments: [],
        metadata: { custom: {} },
      },
    ];

    expect(
      toLanguageModelMessages(messages, { unstable_includeId: true }),
    ).toEqual([
      {
        role: "user",
        content: [{ type: "text", text: "hello" }],
        unstable_id: "visible-user",
      },
    ]);
  });

  it("preserves the source ID on split assistant messages", () => {
    const messages: ThreadMessage[] = [
      {
        id: "assistant-1",
        role: "assistant",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        content: [
          { type: "text", text: "before" },
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "lookup",
            args: { query: "assistant-ui" },
            argsText: '{"query":"assistant-ui"}',
            result: { found: true },
          },
          { type: "text", text: "after" },
        ],
        status: { type: "complete", reason: "stop" },
        metadata: { custom: {} },
      },
    ];

    const converted = toLanguageModelMessages(messages, {
      unstable_includeId: true,
    });

    expect(converted.map((message) => message.role)).toEqual([
      "assistant",
      "tool",
      "assistant",
    ]);
    expect(converted[0]).toHaveProperty("unstable_id", "assistant-1");
    expect(converted[1]).not.toHaveProperty("unstable_id");
    expect(converted[2]).toHaveProperty("unstable_id", "assistant-1");
  });

  it("carries a file part filename through to the model message", () => {
    const [message] = toLanguageModelMessages([
      {
        id: "user-1",
        role: "user",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        content: [
          {
            type: "file",
            data: "SGVsbG8=",
            mimeType: "text/plain",
            filename: "notes.txt",
          },
        ],
        attachments: [],
        metadata: { custom: {} },
      },
    ]);
    if (message?.role !== "user") throw new Error("Expected a user message");

    expect(message.content[0]).toMatchObject({
      type: "file",
      filename: "notes.txt",
    });
  });

  it("omits filename when the part has none", () => {
    const [message] = toLanguageModelMessages([createFileMessage("SGVsbG8=")]);
    if (message?.role !== "user") throw new Error("Expected a user message");

    expect(message.content[0]).not.toHaveProperty("filename");
  });

  it("preserves base64 file data as a string", () => {
    expect(convertFileData("SGVsbG8=")).toBe("SGVsbG8=");
  });

  it("preserves absolute file URLs", () => {
    const data = convertFileData("https://example.com/file.txt");

    expect(data).toBeInstanceOf(URL);
    expect(String(data)).toBe("https://example.com/file.txt");
  });

  it("preserves data URLs", () => {
    const url = "data:text/plain;base64,SGVsbG8=";
    const data = convertFileData(url);

    expect(data).toBeInstanceOf(URL);
    expect(String(data)).toBe(url);
  });
});

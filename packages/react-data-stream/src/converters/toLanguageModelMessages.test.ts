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

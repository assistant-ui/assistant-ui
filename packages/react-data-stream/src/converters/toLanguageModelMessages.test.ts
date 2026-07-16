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

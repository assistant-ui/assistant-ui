import { describe, expect, it } from "vitest";
import type { AppendMessage } from "@assistant-ui/react";
import { getMessageContent } from "./getMessageContent";

describe("getMessageContent", () => {
  it("returns a string for single text messages", () => {
    const message: AppendMessage = {
      role: "user",
      content: [{ type: "text", text: "Hello" }],
    };

    expect(getMessageContent(message)).toBe("Hello");
  });

  it("maps text and image content into A2A content blocks", () => {
    const message: AppendMessage = {
      role: "user",
      content: [{ type: "text", text: "Describe this image" }],
      attachments: [
        {
          id: "img-1",
          type: "image",
          name: "diagram.png",
          status: { type: "complete" },
          contentType: "image/png",
          content: [
            { type: "image", image: "https://cdn.example.com/img.png" },
          ],
        },
      ],
    };

    expect(getMessageContent(message)).toEqual([
      { type: "text", text: "Describe this image" },
      {
        type: "image_url",
        image_url: { url: "https://cdn.example.com/img.png" },
      },
    ]);
  });

  it("throws for tool-call append parts", () => {
    const message: AppendMessage = {
      role: "user",
      content: [
        {
          type: "tool-call",
          toolCallId: "tc-1",
          toolName: "search",
          args: { query: "hello" },
          argsText: '{"query":"hello"}',
        },
      ],
    };

    expect(() => getMessageContent(message)).toThrow(
      "Tool call appends are not supported.",
    );
  });

  it("throws for unsupported component append parts", () => {
    const message: AppendMessage = {
      role: "user",
      content: [
        {
          type: "component",
          name: "status-chip",
          props: { label: "Ready" },
        },
      ],
    };

    expect(() => getMessageContent(message)).toThrow(
      "Unsupported append message part type: component",
    );
  });
});

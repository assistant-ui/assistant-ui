import type { AppendMessage } from "@assistant-ui/core";
import type { FlueConversationMessage } from "@flue/react";
import { describe, expect, it } from "vitest";
import { convertFlueMessages, getFlueSendMessage } from "./convertFlueMessages";

const messages: FlueConversationMessage[] = [
  {
    id: "user-1",
    role: "user",
    purpose: "user",
    display: "visible",
    parts: [
      { type: "text", text: "Run it", state: "done" },
      {
        type: "file",
        id: "file-1",
        url: "https://example.com/image.png",
        mediaType: "image/png",
        filename: "image.png",
        size: 42,
      },
    ],
  },
  {
    id: "assistant-1",
    role: "assistant",
    purpose: "assistant",
    display: "visible",
    submissionId: "submission-1",
    metadata: { model: "demo", timestamp: "2026-09-23T12:00:00.000Z" },
    parts: [
      { type: "reasoning", text: "Planning", state: "done" },
      {
        type: "dynamic-tool",
        toolName: "run_demo",
        toolCallId: "tool-1",
        state: "output-available",
        input: { target: "demo" },
        output: { ok: true },
        durationMs: 25,
      },
      { type: "data-progress", data: { value: 100 } },
      { type: "text", text: "Finished", state: "streaming" },
    ],
  },
  {
    id: "diagnostic-1",
    role: "system",
    purpose: "advisory",
    display: "diagnostic",
    parts: [{ type: "text", text: "Internal advisory", state: "done" }],
  },
];

describe("convertFlueMessages", () => {
  it("maps visible message parts and hides diagnostic messages", () => {
    const converted = convertFlueMessages(messages, {
      isRunning: true,
      getCreatedAt: () => new Date("2026-09-23T12:00:00.000Z"),
    });

    expect(converted).toHaveLength(2);
    expect(converted[0]).toMatchObject({
      id: "user-1",
      role: "user",
      content: [
        { type: "text", text: "Run it" },
        {
          type: "file",
          data: "https://example.com/image.png",
          mimeType: "image/png",
          sourceType: "url",
        },
      ],
      attachments: [
        {
          id: "file-1",
          type: "image",
          name: "image.png",
          contentType: "image/png",
        },
      ],
    });
    expect(converted[1]).toMatchObject({
      id: "assistant-1",
      role: "assistant",
      status: { type: "running" },
      content: [
        {
          type: "reasoning",
          text: "Planning",
          status: { type: "complete" },
        },
        {
          type: "tool-call",
          toolCallId: "tool-1",
          toolName: "run_demo",
          args: { target: "demo" },
          result: { ok: true },
          providerMetadata: { flue: { durationMs: 25 } },
        },
        { type: "data", name: "progress", data: { value: 100 } },
        {
          type: "text",
          text: "Finished",
          status: { type: "running" },
        },
      ],
      metadata: {
        custom: {
          model: "demo",
          timestamp: "2026-09-23T12:00:00.000Z",
          purpose: "assistant",
          display: "visible",
          submissionId: "submission-1",
        },
      },
    });
  });

  it("maps the active Flue error onto the last assistant message", () => {
    const converted = convertFlueMessages(messages.slice(0, 2), {
      error: new Error("stream failed"),
    });

    expect(converted[1]?.status).toEqual({
      type: "incomplete",
      reason: "error",
      error: { code: "unknown", message: "stream failed" },
    });
  });
});

const appendMessage = (content: AppendMessage["content"]): AppendMessage => ({
  role: "user",
  content,
  attachments: [],
  createdAt: new Date(),
  metadata: { custom: {} },
  parentId: null,
  sourceId: null,
  runConfig: undefined,
});

describe("getFlueSendMessage", () => {
  it("converts text and data URL images into Flue's send shape", () => {
    expect(
      getFlueSendMessage(
        appendMessage([
          { type: "text", text: "Describe this" },
          {
            type: "image",
            image: "data:image/png;base64,aGVsbG8=",
            filename: "demo.png",
          },
        ]),
      ),
    ).toEqual({
      message: "Describe this",
      images: [
        {
          type: "image",
          data: "aGVsbG8=",
          mimeType: "image/png",
          filename: "demo.png",
        },
      ],
    });
  });

  it("rejects non-image files", () => {
    expect(() =>
      getFlueSendMessage(
        appendMessage([
          {
            type: "file",
            data: "aGVsbG8=",
            mimeType: "application/pdf",
            filename: "demo.pdf",
          },
        ]),
      ),
    ).toThrow("Flue only supports image attachments");
  });

  it("rejects remote image URLs because Flue expects base64 bytes", () => {
    expect(() =>
      getFlueSendMessage(
        appendMessage([
          {
            type: "image",
            image: "https://example.com/demo.png",
          },
        ]),
      ),
    ).toThrow("Flue image attachments must contain base64 data");
  });
});

import { describe, expect, it } from "vitest";
import type { EveMessageData } from "eve/react";
import {
  convertEveMessages,
  getEveMessageContent,
  toEveInputResponse,
} from "./convertEveMessages";
import type { AppendMessage } from "@assistant-ui/core";

describe("convertEveMessages", () => {
  it("converts text and reasoning parts", () => {
    const data = {
      messages: [
        {
          id: "u1",
          role: "user",
          parts: [{ type: "text", text: "Hello" }],
        },
        {
          id: "a1",
          role: "assistant",
          metadata: { status: "streaming" },
          parts: [
            { type: "reasoning", text: "Thinking" },
            { type: "text", text: "Hi there" },
          ],
        },
      ],
    } satisfies EveMessageData;

    const messages = convertEveMessages(data, { isRunning: true });

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      id: "u1",
      role: "user",
      content: [{ type: "text", text: "Hello" }],
    });
    expect(messages[1]).toMatchObject({
      id: "a1",
      role: "assistant",
      status: { type: "running" },
      content: [
        { type: "reasoning", text: "Thinking" },
        { type: "text", text: "Hi there" },
      ],
    });
  });

  it("converts dynamic tool parts with approval options", () => {
    const data = {
      messages: [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "dynamic-tool",
              state: "approval-requested",
              toolCallId: "call_1",
              toolName: "send_email",
              input: { to: "dev@example.com" },
              approval: { id: "req_1" },
              toolMetadata: {
                eve: {
                  kind: "tool-call",
                  name: "send_email",
                  inputRequest: {
                    requestId: "req_1",
                    prompt: "Send the email?",
                    display: "confirmation",
                    options: [
                      { id: "approve", label: "Approve" },
                      { id: "deny", label: "Deny", style: "danger" },
                      { id: "escalate", label: "Escalate" },
                    ],
                  },
                },
              },
            },
          ],
        },
      ],
    } satisfies EveMessageData;

    const [message] = convertEveMessages(data);

    expect(message).toMatchObject({
      status: { type: "requires-action", reason: "tool-calls" },
      content: [
        {
          type: "tool-call",
          toolCallId: "call_1",
          toolName: "send_email",
          args: { to: "dev@example.com" },
          approval: {
            id: "req_1",
            options: [
              { id: "approve", kind: "allow-once", label: "Approve" },
              { id: "deny", kind: "reject-once", label: "Deny" },
              { id: "escalate", kind: "_escalate", label: "Escalate" },
            ],
          },
        },
      ],
    });
  });

  it("handles denied tool parts without an approval reason", () => {
    const data = {
      messages: [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "dynamic-tool",
              state: "output-denied",
              toolCallId: "call_1",
              toolName: "send_email",
              input: { to: "dev@example.com" },
              approval: { id: "req_1", approved: false },
            },
          ],
        },
      ],
    } satisfies EveMessageData;

    const [message] = convertEveMessages(data);

    expect(message).toMatchObject({
      content: [
        {
          type: "tool-call",
          toolCallId: "call_1",
          toolName: "send_email",
          result: { error: "Tool approval denied" },
          isError: true,
        },
      ],
    });
  });

  it("drops empty and whitespace-only assistant text and reasoning parts", () => {
    const data = {
      messages: [
        {
          id: "a1",
          role: "assistant",
          parts: [
            { type: "text", text: "" },
            { type: "reasoning", text: "   " },
            { type: "text", text: "Hi" },
          ],
        },
      ],
    } satisfies EveMessageData;

    const [message] = convertEveMessages(data);

    expect(message?.content).toEqual([{ type: "text", text: "Hi" }]);
  });

  it("preserves isOptimistic on optimistic user messages", () => {
    const data = {
      messages: [
        {
          id: "u1",
          role: "user",
          metadata: { optimistic: true },
          parts: [{ type: "text", text: "Hello" }],
        },
      ],
    } satisfies EveMessageData;

    const [message] = convertEveMessages(data);

    expect(message?.metadata.isOptimistic).toBe(true);
  });

  it("omits isOptimistic on confirmed user messages", () => {
    const data = {
      messages: [
        {
          id: "u1",
          role: "user",
          metadata: { status: "submitted" },
          parts: [{ type: "text", text: "Hello" }],
        },
      ],
    } satisfies EveMessageData;

    const [message] = convertEveMessages(data);

    expect(message?.metadata).not.toHaveProperty("isOptimistic");
  });

  it("falls back to an empty text part for user messages with only url-less file parts", () => {
    const data = {
      messages: [
        {
          id: "u1",
          role: "user",
          parts: [{ type: "file", mediaType: "image/png" }],
        },
      ],
    } satisfies EveMessageData;

    const [message] = convertEveMessages(data);

    expect(message?.content).toEqual([{ type: "text", text: "" }]);
    expect(message?.attachments).toEqual([]);
  });

  it("drops url-less user file parts without triggering the fallback", () => {
    const data = {
      messages: [
        {
          id: "u1",
          role: "user",
          parts: [
            { type: "file", mediaType: "image/png" },
            { type: "text", text: "Hello" },
          ],
        },
      ],
    } satisfies EveMessageData;

    const [message] = convertEveMessages(data);

    expect(message?.content).toEqual([{ type: "text", text: "Hello" }]);
  });

  it("converts a user file part into content and a file attachment", () => {
    const data = {
      messages: [
        {
          id: "u1",
          role: "user",
          parts: [
            { type: "text", text: "See the report" },
            {
              type: "file",
              url: "https://example.com/report.pdf",
              mediaType: "application/pdf",
              filename: "report.pdf",
              size: 1024,
            },
          ],
        },
      ],
    } satisfies EveMessageData;

    const [message] = convertEveMessages(data);

    expect(message?.content).toEqual([
      { type: "text", text: "See the report" },
      {
        type: "file",
        data: "https://example.com/report.pdf",
        mimeType: "application/pdf",
        filename: "report.pdf",
        sourceType: "url",
      },
    ]);
    expect(message?.attachments).toEqual([
      {
        id: "0",
        type: "file",
        name: "report.pdf",
        content: [
          {
            type: "file",
            data: "https://example.com/report.pdf",
            mimeType: "application/pdf",
            filename: "report.pdf",
            sourceType: "url",
          },
        ],
        contentType: "application/pdf",
        status: { type: "complete" },
      },
    ]);
  });

  it("converts a user image file part into an image attachment", () => {
    const data = {
      messages: [
        {
          id: "u1",
          role: "user",
          parts: [
            {
              type: "file",
              url: "https://example.com/photo.png",
              mediaType: "image/png",
              filename: "photo.png",
            },
          ],
        },
      ],
    } satisfies EveMessageData;

    const [message] = convertEveMessages(data);

    expect(message?.content).toEqual([
      {
        type: "file",
        data: "https://example.com/photo.png",
        mimeType: "image/png",
        filename: "photo.png",
        sourceType: "url",
      },
    ]);
    expect(message?.attachments).toEqual([
      {
        id: "0",
        type: "image",
        name: "photo.png",
        content: [
          {
            type: "image",
            image: "https://example.com/photo.png",
            filename: "photo.png",
          },
        ],
        contentType: "image/png",
        status: { type: "complete" },
      },
    ]);
  });

  it("omits sourceType and falls back to a generic name for data url file parts", () => {
    const data = {
      messages: [
        {
          id: "u1",
          role: "user",
          parts: [
            {
              type: "file",
              url: "data:application/pdf;base64,QUJD",
              mediaType: "application/pdf",
            },
          ],
        },
      ],
    } satisfies EveMessageData;

    const [message] = convertEveMessages(data);

    expect(message?.content).toEqual([
      {
        type: "file",
        data: "data:application/pdf;base64,QUJD",
        mimeType: "application/pdf",
      },
    ]);
    expect(message?.attachments).toEqual([
      {
        id: "0",
        type: "file",
        name: "file",
        content: [
          {
            type: "file",
            data: "data:application/pdf;base64,QUJD",
            mimeType: "application/pdf",
          },
        ],
        contentType: "application/pdf",
        status: { type: "complete" },
      },
    ]);
  });

  it("assigns sequential attachment ids across multiple file parts", () => {
    const data = {
      messages: [
        {
          id: "u1",
          role: "user",
          parts: [
            {
              type: "file",
              url: "https://example.com/a.pdf",
              mediaType: "application/pdf",
            },
            { type: "file", mediaType: "image/png" },
            {
              type: "file",
              url: "https://example.com/b.png",
              mediaType: "image/png",
            },
          ],
        },
      ],
    } satisfies EveMessageData;

    const [message] = convertEveMessages(data);

    expect(message?.attachments?.map((a) => [a.id, a.type])).toEqual([
      ["0", "file"],
      ["1", "image"],
    ]);
  });

  it("defaults a file part with a missing mediaType to unknown/unknown", () => {
    const data = {
      messages: [
        {
          id: "u1",
          role: "user",
          parts: [{ type: "file", url: "https://example.com/blob" }],
        },
      ],
    } as unknown as EveMessageData;

    const [message] = convertEveMessages(data);

    expect(message?.content).toEqual([
      {
        type: "file",
        data: "https://example.com/blob",
        mimeType: "unknown/unknown",
        sourceType: "url",
      },
    ]);
    expect(message?.attachments).toEqual([
      {
        id: "0",
        type: "file",
        name: "file",
        content: [
          {
            type: "file",
            data: "https://example.com/blob",
            mimeType: "unknown/unknown",
            sourceType: "url",
          },
        ],
        contentType: "unknown/unknown",
        status: { type: "complete" },
      },
    ]);
  });

  it("converts an assistant file part into a file content part", () => {
    const data = {
      messages: [
        {
          id: "a1",
          role: "assistant",
          parts: [
            { type: "text", text: "Here you go" },
            {
              type: "file",
              url: "https://example.com/result.csv",
              mediaType: "text/csv",
              filename: "result.csv",
            },
          ],
        },
      ],
    } satisfies EveMessageData;

    const [message] = convertEveMessages(data);

    expect(message?.content).toEqual([
      { type: "text", text: "Here you go" },
      {
        type: "file",
        data: "https://example.com/result.csv",
        mimeType: "text/csv",
        filename: "result.csv",
        sourceType: "url",
      },
    ]);
  });

  it("drops non-convertible part types instead of throwing", () => {
    const data = {
      messages: [
        {
          id: "a1",
          role: "assistant",
          parts: [
            { type: "step-start" },
            {
              type: "authorization",
              state: "required",
              name: "github",
              description: "Sign in to GitHub",
              displayName: "GitHub",
              stepIndex: 0,
              turnId: "turn_1",
            },
            { type: "file", mediaType: "application/pdf" },
            { type: "text", text: "Done" },
          ],
        },
      ],
    } satisfies EveMessageData;

    const [message] = convertEveMessages(data);

    expect(message?.content).toEqual([{ type: "text", text: "Done" }]);
  });

  it("uses the supplied message creation time", () => {
    const createdAt = new Date("2026-06-17T00:00:00.000Z");
    const data = {
      messages: [
        {
          id: "u1",
          role: "user",
          parts: [{ type: "text", text: "Hello" }],
        },
      ],
    } satisfies EveMessageData;

    const [message] = convertEveMessages(data, {
      getCreatedAt: () => createdAt,
    });

    expect(message?.createdAt).toBe(createdAt);
  });
});

describe("getEveMessageContent", () => {
  const baseAppendMessage = {
    role: "user",
    createdAt: new Date(),
    parentId: null,
    sourceId: null,
    runConfig: undefined,
    metadata: { custom: {} },
    attachments: [],
  } as const;

  it("returns plain text for text-only messages", () => {
    const message = {
      ...baseAppendMessage,
      content: [{ type: "text", text: "Hello" }],
    } satisfies AppendMessage;

    expect(getEveMessageContent(message)).toBe("Hello");
  });

  it("converts an audio part into a file part with the format-derived media type", () => {
    const message = {
      ...baseAppendMessage,
      content: [{ type: "audio", audio: { data: "QUJD", format: "mp3" } }],
    } as unknown as AppendMessage;

    expect(getEveMessageContent(message)).toEqual([
      {
        type: "file",
        data: "data:audio/mp3;base64,QUJD",
        mediaType: "audio/mp3",
      },
    ]);
  });

  it("converts a wav audio part", () => {
    const message = {
      ...baseAppendMessage,
      content: [{ type: "audio", audio: { data: "QUJD", format: "wav" } }],
    } as unknown as AppendMessage;

    expect(getEveMessageContent(message)).toEqual([
      {
        type: "file",
        data: "data:audio/wav;base64,QUJD",
        mediaType: "audio/wav",
      },
    ]);
  });

  it("rebuilds the audio data URL envelope from the typed format", () => {
    const message = {
      ...baseAppendMessage,
      content: [
        {
          type: "audio",
          audio: { data: "data:audio/mpeg;base64,QUJD", format: "mp3" },
        },
      ],
    } as unknown as AppendMessage;

    expect(getEveMessageContent(message)).toEqual([
      {
        type: "file",
        data: "data:audio/mp3;base64,QUJD",
        mediaType: "audio/mp3",
      },
    ]);
  });

  it("forwards an http audio source instead of wrapping it in a data URL", () => {
    const message = {
      ...baseAppendMessage,
      content: [
        {
          type: "audio",
          audio: { data: "https://cdn.example.com/memo.mp3", format: "mp3" },
        },
      ],
    } as unknown as AppendMessage;

    expect(getEveMessageContent(message)).toEqual([
      {
        type: "file",
        data: "https://cdn.example.com/memo.mp3",
        mediaType: "audio/mp3",
      },
    ]);
  });

  it("round-trips a sent file attachment through the eve echo shape", () => {
    const message = {
      ...baseAppendMessage,
      content: [],
      attachments: [
        {
          id: "1",
          type: "file",
          name: "report.pdf",
          content: [
            {
              type: "file",
              data: "https://example.com/report.pdf",
              mimeType: "application/pdf",
              filename: "report.pdf",
            },
          ],
          status: { type: "complete" },
        },
      ],
    } as unknown as AppendMessage;

    expect(getEveMessageContent(message)).toEqual([
      {
        type: "file",
        data: "https://example.com/report.pdf",
        mediaType: "application/pdf",
        filename: "report.pdf",
      },
    ]);

    const [echoed] = convertEveMessages({
      messages: [
        {
          id: "t1:user",
          role: "user",
          metadata: { status: "complete", turnId: "t1" },
          parts: [
            {
              type: "file",
              url: "https://example.com/report.pdf",
              mediaType: "application/pdf",
              filename: "report.pdf",
            },
          ],
        },
      ],
    } satisfies EveMessageData);

    expect(echoed?.content).toEqual([
      {
        type: "file",
        data: "https://example.com/report.pdf",
        mimeType: "application/pdf",
        filename: "report.pdf",
        sourceType: "url",
      },
    ]);
  });

  it("skips data parts while keeping surrounding text", () => {
    const message = {
      ...baseAppendMessage,
      content: [
        { type: "text", text: "hi" },
        { type: "data", name: "chart", data: { x: 1 } },
      ],
    } as unknown as AppendMessage;

    expect(getEveMessageContent(message)).toBe("hi");
  });
});

describe("toEveInputResponse", () => {
  it("maps assistant-ui approval responses to eve input responses", () => {
    expect(
      toEveInputResponse({
        approvalId: "req_1",
        approved: false,
        reason: "Not yet",
      }),
    ).toEqual({
      requestId: "req_1",
      optionId: "deny",
      text: "Not yet",
    });
  });
});

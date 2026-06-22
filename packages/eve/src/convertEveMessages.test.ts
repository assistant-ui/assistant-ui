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
  it("returns plain text for text-only messages", () => {
    const message = {
      role: "user",
      createdAt: new Date(),
      parentId: null,
      sourceId: null,
      runConfig: undefined,
      content: [{ type: "text", text: "Hello" }],
      metadata: { custom: {} },
      attachments: [],
    } satisfies AppendMessage;

    expect(getEveMessageContent(message)).toBe("Hello");
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

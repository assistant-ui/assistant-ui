import { describe, expect, it } from "vitest";
import type { EveMessageData } from "eve/react";
import { defaultMessageReducer, type EveAgentReducerEvent } from "eve/client";
import {
  convertEveMessages,
  findEveInputRequest,
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

  it("preserves the full HITL input request on providerMetadata.eve", () => {
    const inputRequest = {
      requestId: "req_1",
      prompt: "Which environment?",
      display: "select",
      allowFreeform: true,
      options: [
        { id: "staging", label: "Staging", description: "Safe" },
        { id: "production", label: "Production", style: "danger" },
      ],
    } as const;
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
              input: {},
              approval: { id: "req_1" },
              toolMetadata: {
                eve: { kind: "tool-call", name: "send_email", inputRequest },
              },
            },
          ],
        },
      ],
    } satisfies EveMessageData;

    const [message] = convertEveMessages(data);
    const part = message!.content[0];

    expect(part).toMatchObject({ type: "tool-call" });
    expect((part as { providerMetadata?: unknown }).providerMetadata).toEqual({
      eve: {
        inputRequest: {
          requestId: "req_1",
          prompt: "Which environment?",
          display: "select",
          allowFreeform: true,
          options: [
            { id: "staging", label: "Staging", description: "Safe" },
            { id: "production", label: "Production", style: "danger" },
          ],
        },
      },
    });
  });

  it("omits undefined input-request fields from the provider metadata projection", () => {
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
              toolName: "ask_question",
              input: {},
              approval: { id: "req_1" },
              toolMetadata: {
                eve: {
                  kind: "tool-call",
                  name: "ask_question",
                  inputRequest: {
                    requestId: "req_1",
                    prompt: "What should the subject line be?",
                  },
                },
              },
            },
          ],
        },
      ],
    } satisfies EveMessageData;

    const [message] = convertEveMessages(data);
    const part = message!.content[0];

    expect((part as { providerMetadata?: unknown }).providerMetadata).toEqual({
      eve: {
        inputRequest: {
          requestId: "req_1",
          prompt: "What should the subject line be?",
        },
      },
    });
  });

  it("omits providerMetadata when the tool part carries no input request", () => {
    const data = {
      messages: [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "dynamic-tool",
              state: "input-available",
              toolCallId: "call_1",
              toolName: "send_email",
              input: {},
            },
            {
              type: "dynamic-tool",
              state: "approval-requested",
              toolCallId: "call_2",
              toolName: "send_email",
              input: {},
              approval: { id: "req_2" },
              toolMetadata: { eve: { kind: "tool-call", name: "send_email" } },
            },
          ],
        },
      ],
    } satisfies EveMessageData;

    const [message] = convertEveMessages(data);

    expect(message!.content[0]).not.toHaveProperty("providerMetadata");
    expect(message!.content[1]).not.toHaveProperty("providerMetadata");
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

  describe("assistant message status mapping", () => {
    const withStatus = (
      status: "streaming" | "complete" | "failed",
    ): EveMessageData => ({
      messages: [
        {
          id: "a1",
          role: "assistant",
          metadata: { status },
          parts: [{ type: "text", text: "Hi" }],
        },
      ],
    });

    it("maps a running last message to running", () => {
      const [message] = convertEveMessages(withStatus("streaming"), {
        isRunning: true,
      });

      expect(message?.status).toEqual({ type: "running" });
    });

    it("keeps the legacy running mapping for a streaming marker when liveness is omitted", () => {
      const [message] = convertEveMessages(withStatus("streaming"));

      expect(message?.status).toEqual({ type: "running" });
    });

    it("maps a stale streaming marker to cancelled when no longer running", () => {
      const [message] = convertEveMessages(withStatus("streaming"), {
        isRunning: false,
      });

      expect(message?.status).toEqual({
        type: "incomplete",
        reason: "cancelled",
      });
    });

    it("maps a stale streaming marker to error when the session error is set", () => {
      const [message] = convertEveMessages(withStatus("streaming"), {
        isRunning: false,
        error: new Error("boom"),
      });

      expect(message?.status).toEqual({
        type: "incomplete",
        reason: "error",
        error: { code: "unknown", message: "boom" },
      });
    });

    it("maps a stuck streaming message to cancelled while a newer turn runs", () => {
      const data = {
        messages: [
          {
            id: "a1",
            role: "assistant",
            metadata: { status: "streaming" },
            parts: [{ type: "text", text: "Interrupted" }],
          },
          {
            id: "u2",
            role: "user",
            parts: [{ type: "text", text: "Try again" }],
          },
        ],
      } satisfies EveMessageData;

      const [assistant] = convertEveMessages(data, {
        isRunning: true,
        error: new Error("boom"),
      });

      expect(assistant?.status).toEqual({
        type: "incomplete",
        reason: "cancelled",
      });
    });

    it("keeps a completed message complete even when the session error is set", () => {
      const [message] = convertEveMessages(withStatus("complete"), {
        isRunning: false,
        error: new Error("boom"),
      });

      expect(message?.status).toEqual({ type: "complete", reason: "stop" });
    });

    it("maps an assistant failed marker to an error status", () => {
      const [message] = convertEveMessages(withStatus("failed"), {
        isRunning: false,
      });

      expect(message?.status).toEqual({ type: "incomplete", reason: "error" });
    });

    it("keeps requires-action for pending approvals when not running", () => {
      const data = {
        messages: [
          {
            id: "a1",
            role: "assistant",
            metadata: { status: "streaming" },
            parts: [
              {
                type: "dynamic-tool",
                state: "approval-requested",
                toolCallId: "call_1",
                toolName: "send_email",
                input: {},
                approval: { id: "req_1" },
              },
            ],
          },
        ],
      } satisfies EveMessageData;

      const [message] = convertEveMessages(data, { isRunning: false });

      expect(message?.status).toEqual({
        type: "requires-action",
        reason: "tool-calls",
      });
    });

    describe("contract with eve's default reducer", () => {
      const replay = (events: readonly EveAgentReducerEvent[]) => {
        const reducer = defaultMessageReducer();
        return events.reduce(
          (state, event) => reducer.reduce(state, event),
          reducer.initial(),
        );
      };

      const midStreamEvents: readonly EveAgentReducerEvent[] = [
        {
          type: "client.message.submitted",
          data: { submissionId: "sub_1", message: "hi", createdAt: 0 },
        },
        {
          type: "turn.started",
          data: { turnId: "turn_1", sequence: 0 },
        },
        {
          type: "step.started",
          data: { turnId: "turn_1", stepIndex: 0, sequence: 1 },
        },
        {
          type: "message.appended",
          data: {
            turnId: "turn_1",
            stepIndex: 0,
            sequence: 2,
            messageDelta: "Let me th",
            messageSoFar: "Let me th",
          },
        },
      ];

      it("a locally aborted turn keeps its streaming marker and converts to cancelled", () => {
        const state = replay(midStreamEvents);

        const assistant = state.messages.find((m) => m.role === "assistant");
        expect(assistant?.metadata?.status).toBe("streaming");

        const converted = convertEveMessages(state, { isRunning: false });
        expect(converted.at(-1)?.status).toEqual({
          type: "incomplete",
          reason: "cancelled",
        });
      });

      it("a failed session keeps its streaming marker and converts to error", () => {
        const state = replay([
          ...midStreamEvents,
          {
            type: "session.failed",
            data: { sessionId: "session_1", code: "internal", message: "boom" },
          },
        ]);

        const assistant = state.messages.find((m) => m.role === "assistant");
        expect(assistant?.metadata?.status).toBe("streaming");

        const converted = convertEveMessages(state, {
          isRunning: false,
          error: new Error("boom"),
        });
        expect(converted.at(-1)?.status).toEqual({
          type: "incomplete",
          reason: "error",
          error: { code: "unknown", message: "boom" },
        });
      });

      it("a failed turn converts to cancelled because the store surfaces no error for turn.failed", () => {
        const state = replay([
          ...midStreamEvents,
          {
            type: "turn.failed",
            data: {
              turnId: "turn_1",
              sequence: 3,
              code: "internal",
              message: "boom",
            },
          },
        ]);

        const converted = convertEveMessages(state, { isRunning: false });
        expect(converted.at(-1)?.status).toEqual({
          type: "incomplete",
          reason: "cancelled",
        });
      });

      it("a completed turn terminalizes the streaming marker and converts to complete", () => {
        const state = replay([
          ...midStreamEvents,
          {
            type: "message.completed",
            data: {
              turnId: "turn_1",
              stepIndex: 0,
              sequence: 3,
              finishReason: "stop",
              message: "Let me think",
            },
          },
          {
            type: "turn.completed",
            data: { turnId: "turn_1", sequence: 4 },
          },
        ]);

        const assistant = state.messages.find((m) => m.role === "assistant");
        expect(assistant?.metadata?.status).toBe("complete");

        const converted = convertEveMessages(state, { isRunning: false });
        expect(converted.at(-1)?.status).toEqual({
          type: "complete",
          reason: "stop",
        });
      });
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

  it("keeps the confirmation mapping when the request carries approve/deny options", () => {
    expect(
      toEveInputResponse(
        { approvalId: "req_1", approved: true },
        {
          requestId: "req_1",
          prompt: "Send the email?",
          display: "confirmation",
          options: [
            { id: "approve", label: "Approve" },
            { id: "deny", label: "Deny" },
          ],
        },
      ),
    ).toEqual({ requestId: "req_1", optionId: "approve" });
  });

  it("maps a select response to the chosen option id", () => {
    expect(
      toEveInputResponse(
        { approvalId: "req_1", approved: true, optionId: "staging" },
        {
          requestId: "req_1",
          prompt: "Which environment?",
          display: "select",
          options: [
            { id: "staging", label: "Staging" },
            { id: "production", label: "Production" },
          ],
        },
      ),
    ).toEqual({ requestId: "req_1", optionId: "staging" });
  });

  it("answers a text-display request with the free-form text, not an option id", () => {
    const response = toEveInputResponse(
      { approvalId: "req_1", approved: true, reason: "Quarterly results" },
      {
        requestId: "req_1",
        prompt: "What should the subject line be?",
        display: "text",
        allowFreeform: true,
      },
    );

    expect(response).toEqual({ requestId: "req_1", text: "Quarterly results" });
    expect(response).not.toHaveProperty("optionId");
  });

  it("throws instead of fabricating approve for a text-display request without an answer", () => {
    expect(() =>
      toEveInputResponse(
        { approvalId: "req_1", approved: true },
        {
          requestId: "req_1",
          prompt: "What should the subject line be?",
          display: "text",
        },
      ),
    ).toThrow(/free-form text answer/);
  });

  it("throws instead of fabricating approve for a select request without a chosen option", () => {
    expect(() =>
      toEveInputResponse(
        { approvalId: "req_1", approved: true },
        {
          requestId: "req_1",
          prompt: "Which environment?",
          display: "select",
          options: [
            { id: "staging", label: "Staging" },
            { id: "production", label: "Production" },
          ],
        },
      ),
    ).toThrow(/no matching option/);
  });

  it("prefers a literal approve option over the free-form path on a text-display request", () => {
    const inputRequest = {
      requestId: "req_1",
      prompt: "What should the subject line be?",
      display: "text",
      options: [
        { id: "approve", label: "Approve" },
        { id: "deny", label: "Deny" },
      ],
    } as const;

    expect(
      toEveInputResponse({ approvalId: "req_1", approved: true }, inputRequest),
    ).toEqual({ requestId: "req_1", optionId: "approve" });

    expect(
      toEveInputResponse(
        { approvalId: "req_1", approved: true, reason: "Quarterly results" },
        inputRequest,
      ),
    ).toEqual({
      requestId: "req_1",
      optionId: "approve",
      text: "Quarterly results",
    });
  });

  it("answers an allowFreeform request without options with text, not a fabricated option id", () => {
    const response = toEveInputResponse(
      {
        approvalId: "req_1",
        approved: true,
        reason: "prefer the blue variant",
      },
      {
        requestId: "req_1",
        prompt: "Any preference?",
        allowFreeform: true,
      },
    );

    expect(response).toEqual({
      requestId: "req_1",
      text: "prefer the blue variant",
    });
    expect(response).not.toHaveProperty("optionId");
  });

  it("answers an optionless request with text even without display or allowFreeform", () => {
    expect(
      toEveInputResponse(
        { approvalId: "req_1", approved: true, reason: "Next Tuesday" },
        { requestId: "req_1", prompt: "When should this ship?" },
      ),
    ).toEqual({ requestId: "req_1", text: "Next Tuesday" });

    expect(() =>
      toEveInputResponse(
        { approvalId: "req_1", approved: false },
        { requestId: "req_1", prompt: "When should this ship?" },
      ),
    ).toThrow(/free-form text answer/);
  });

  it("falls back to free-form text for a select request that allows it", () => {
    expect(
      toEveInputResponse(
        { approvalId: "req_1", approved: true, reason: "the eu region" },
        {
          requestId: "req_1",
          prompt: "Which environment?",
          display: "select",
          allowFreeform: true,
          options: [
            { id: "staging", label: "Staging" },
            { id: "production", label: "Production" },
          ],
        },
      ),
    ).toEqual({ requestId: "req_1", text: "the eu region" });
  });
});

describe("findEveInputRequest", () => {
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
            toolName: "ask_question",
            input: {},
            approval: { id: "req_1" },
            toolMetadata: {
              eve: {
                kind: "tool-call",
                name: "ask_question",
                inputRequest: {
                  requestId: "req_1",
                  prompt: "What should the subject line be?",
                  display: "text",
                  allowFreeform: true,
                },
              },
            },
          },
        ],
      },
    ],
  } satisfies EveMessageData;

  it("finds the input request by approval id", () => {
    expect(findEveInputRequest(data, "req_1")).toMatchObject({
      requestId: "req_1",
      display: "text",
    });
  });

  it("returns undefined for unknown approval ids", () => {
    expect(findEveInputRequest(data, "req_404")).toBeUndefined();
  });

  it("round-trips a text-display request into a free-form eve input response", () => {
    const inputRequest = findEveInputRequest(data, "req_1");

    expect(
      toEveInputResponse(
        { approvalId: "req_1", approved: true, reason: "Weekly digest" },
        inputRequest,
      ),
    ).toEqual({ requestId: "req_1", text: "Weekly digest" });
  });
});

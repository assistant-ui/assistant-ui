import { describe, expect, it } from "vitest";
import type { EveMessageData, EveMessageInputRequest } from "eve/react";
import { defaultMessageReducer, type EveAgentReducerEvent } from "eve/client";
import {
  convertEveMessages,
  findEveInputRequest,
  getEveMessageContent,
  toEveInputResponse,
} from "./convertEveMessages";
import type { AppendMessage } from "@assistant-ui/core";

const withApprovalPart = (eve?: {
  kind: "tool-call";
  name: string;
  inputRequest?: EveMessageInputRequest;
}): EveMessageData => ({
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
          ...(eve && { toolMetadata: { eve } }),
        },
      ],
    },
  ],
});

const eventMeta = (sequence: number) => ({
  at: "2026-01-01T00:00:00.000Z",
  id: `evt_${sequence}`,
});

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

  it("omits the part status when the part state is still streaming", () => {
    const data = {
      messages: [
        {
          id: "a1",
          role: "assistant",
          metadata: { status: "streaming" },
          parts: [
            { type: "reasoning", text: "Thinking", state: "streaming" },
            { type: "text", text: "Hi", state: "streaming" },
          ],
        },
      ],
    } satisfies EveMessageData;

    const messages = convertEveMessages(data, { isRunning: true });

    for (const part of messages[0]!.content) {
      expect(part).not.toHaveProperty("status");
    }
  });

  it("maps a done part state to a complete part status", () => {
    const data = {
      messages: [
        {
          id: "a1",
          role: "assistant",
          metadata: { status: "complete" },
          parts: [
            { type: "reasoning", text: "Thinking", state: "done" },
            { type: "text", text: "Hi", state: "done" },
          ],
        },
      ],
    } satisfies EveMessageData;

    const messages = convertEveMessages(data);

    expect(messages[0]!.content).toEqual([
      expect.objectContaining({
        type: "reasoning",
        status: { type: "complete" },
      }),
      expect.objectContaining({ type: "text", status: { type: "complete" } }),
    ]);
  });

  it("omits the part status when the part state is absent", () => {
    const data = {
      messages: [
        {
          id: "a1",
          role: "assistant",
          parts: [
            { type: "reasoning", text: "Thinking" },
            { type: "text", text: "Hi" },
          ],
        },
      ],
    } satisfies EveMessageData;

    const messages = convertEveMessages(data);

    for (const part of messages[0]!.content) {
      expect(part).not.toHaveProperty("status");
    }
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
                    kind: "tool-approval",
                    prompt: "Send the email?",
                    display: "confirmation",
                    options: [
                      { id: "approve", label: "Approve" },
                      { id: "cancel", label: "Cancel", style: "danger" },
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
              { id: "cancel", kind: "reject-once", label: "Cancel" },
              { id: "escalate", kind: "_escalate", label: "Escalate" },
            ],
          },
        },
      ],
    });
  });

  it.each([
    [
      "the full input request",
      {
        requestId: "req_1",
        prompt: "Which environment?",
        kind: "question",
        display: "select",
        allowFreeform: true,
        options: [
          { id: "staging", label: "Staging", description: "Safe" },
          { id: "production", label: "Production", style: "danger" },
        ],
      },
    ],
    [
      "only the fields the request defines",
      {
        requestId: "req_1",
        prompt: "What should the subject line be?",
        kind: "question",
      },
    ],
  ] satisfies [string, EveMessageInputRequest][])(
    "projects %s onto providerMetadata.eve",
    (_label, inputRequest) => {
      const [message] = convertEveMessages(
        withApprovalPart({
          kind: "tool-call",
          name: "send_email",
          inputRequest,
        }),
      );
      const part = message!.content[0];

      expect(part).toMatchObject({ type: "tool-call" });
      expect((part as { providerMetadata?: unknown }).providerMetadata).toEqual(
        {
          eve: { inputRequest },
        },
      );
    },
  );

  it.each([
    [
      "eve metadata without an input request",
      { kind: "tool-call" as const, name: "send_email" },
    ],
    ["no eve metadata at all", undefined],
  ])("omits providerMetadata for a tool part with %s", (_label, eve) => {
    const [message] = convertEveMessages(withApprovalPart(eve));

    expect(message!.content[0]).not.toHaveProperty("providerMetadata");
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
            { type: "future-part", payload: {} },
            { type: "file", mediaType: "application/pdf" },
            { type: "text", text: "Done" },
          ],
        },
      ],
    } as unknown as EveMessageData;

    const [message] = convertEveMessages(data);

    expect(message?.content).toEqual([{ type: "text", text: "Done" }]);
  });

  it("converts an authorization part into a data content part", () => {
    const data = {
      messages: [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "authorization",
              state: "required",
              name: "github",
              description: "Sign in to GitHub",
              displayName: "GitHub",
              stepIndex: 0,
              turnId: "turn_1",
              authorization: {
                displayName: "GitHub",
                instructions: "Enter the code on the device page",
                url: "https://github.com/login/device",
                userCode: "ABCD-1234",
                expiresAt: "2026-01-01T00:00:00Z",
              },
            },
          ],
        },
      ],
    } satisfies EveMessageData;

    const [message] = convertEveMessages(data);

    expect(message?.content).toEqual([
      {
        type: "data",
        name: "authorization",
        data: {
          state: "required",
          name: "github",
          displayName: "GitHub",
          description: "Sign in to GitHub",
          url: "https://github.com/login/device",
          userCode: "ABCD-1234",
          instructions: "Enter the code on the device page",
          expiresAt: "2026-01-01T00:00:00Z",
        },
      },
    ]);
  });

  it("converts an authorization part with missing optional fields", () => {
    const data = {
      messages: [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "authorization",
              state: "required",
              name: "github",
            },
          ],
        },
      ],
    } as unknown as EveMessageData;

    const [message] = convertEveMessages(data);

    expect(message?.content).toEqual([
      {
        type: "data",
        name: "authorization",
        data: { state: "required", name: "github" },
      },
    ]);
  });

  it("drops an authorization url that is not an http(s) address", () => {
    const data = {
      messages: [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "authorization",
              state: "required",
              name: "github",
              authorization: {
                url: "javascript:alert(1)",
                userCode: "ABCD-1234",
              },
            },
          ],
        },
      ],
    } as unknown as EveMessageData;

    const [message] = convertEveMessages(data);

    expect(message?.content).toEqual([
      {
        type: "data",
        name: "authorization",
        data: { state: "required", name: "github", userCode: "ABCD-1234" },
      },
    ]);
  });

  it("carries the outcome of a completed authorization part", () => {
    const data = {
      messages: [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "authorization",
              state: "completed",
              name: "github",
              description: "Sign in to GitHub",
              displayName: "GitHub",
              stepIndex: 0,
              turnId: "turn_1",
              outcome: "authorized",
            },
          ],
        },
      ],
    } satisfies EveMessageData;

    const [message] = convertEveMessages(data);

    expect(message?.content).toEqual([
      {
        type: "data",
        name: "authorization",
        data: {
          state: "completed",
          name: "github",
          displayName: "GitHub",
          description: "Sign in to GitHub",
          outcome: "authorized",
        },
      },
    ]);
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

    it("maps an auth-suspended message to requires-action instead of cancelled", () => {
      const data = {
        messages: [
          {
            id: "a1",
            role: "assistant",
            metadata: { status: "streaming" },
            parts: [
              {
                type: "authorization",
                state: "required",
                name: "github",
                description: "Sign in to GitHub",
                displayName: "GitHub",
                stepIndex: 0,
                turnId: "turn_1",
              },
            ],
          },
        ],
      } satisfies EveMessageData;

      const [message] = convertEveMessages(data, { isRunning: false });

      expect(message?.status).toEqual({
        type: "requires-action",
        reason: "interrupt",
      });
    });

    it("reports tool-calls when an approval and an authorization are both pending", () => {
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
              {
                type: "authorization",
                state: "required",
                name: "github",
                description: "Sign in to GitHub",
                displayName: "GitHub",
                stepIndex: 0,
                turnId: "turn_1",
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

    it("settles a cancelled turn with a pending authorization", () => {
      const reducer = defaultMessageReducer();
      const events: readonly EveAgentReducerEvent[] = [
        {
          type: "authorization.required",
          meta: eventMeta(0),
          data: {
            turnId: "turn_1",
            stepIndex: 0,
            sequence: 0,
            name: "github",
            description: "Sign in to GitHub",
          },
        },
        {
          type: "turn.cancelled",
          meta: eventMeta(1),
          data: { turnId: "turn_1", sequence: 1 },
        },
      ];
      const pendingData = events
        .slice(0, 1)
        .reduce(
          (state, event) => reducer.reduce(state, event),
          reducer.initial(),
        );
      const pendingAssistant = pendingData.messages.find(
        (message) => message.role === "assistant",
      );
      expect(pendingAssistant?.metadata?.status).toBe("streaming");
      expect(
        convertEveMessages(pendingData, { isRunning: false }).at(-1)?.status,
      ).toEqual({
        type: "requires-action",
        reason: "interrupt",
      });

      const data = events
        .slice(1)
        .reduce((state, event) => reducer.reduce(state, event), pendingData);

      const [message] = convertEveMessages(data, { isRunning: false });

      expect(message?.status).toEqual({
        type: "complete",
        reason: "stop",
      });
    });

    it("reports a failed turn with a pending authorization", () => {
      const data = {
        messages: [
          {
            id: "a1",
            role: "assistant",
            metadata: { status: "streaming" },
            parts: [
              {
                type: "authorization",
                state: "required",
                name: "github",
                description: "Sign in to GitHub",
                displayName: "GitHub",
                stepIndex: 0,
                turnId: "turn_1",
              },
            ],
          },
        ],
      } satisfies EveMessageData;

      const error = new Error("authorization failed");
      const [message] = convertEveMessages(data, {
        isRunning: false,
        error,
      });

      expect(message?.status).toEqual({
        type: "incomplete",
        reason: "error",
        error: {
          code: "unknown",
          message: "authorization failed",
        },
      });
    });

    it("keeps an earlier authorization pending when a later turn fails", () => {
      const data = {
        messages: [
          {
            id: "a1",
            role: "assistant",
            metadata: { status: "streaming" },
            parts: [
              {
                type: "authorization",
                state: "required",
                name: "github",
                description: "Sign in to GitHub",
                displayName: "GitHub",
                stepIndex: 0,
                turnId: "turn_1",
              },
            ],
          },
          {
            id: "a2",
            role: "assistant",
            metadata: { status: "streaming" },
            parts: [{ type: "text", text: "Later turn" }],
          },
        ],
      } satisfies EveMessageData;

      const [authorization] = convertEveMessages(data, {
        isRunning: false,
        error: new Error("later turn failed"),
      });

      expect(authorization?.status).toEqual({
        type: "requires-action",
        reason: "interrupt",
      });
    });

    it("does not hold requires-action for a completed authorization", () => {
      const data = {
        messages: [
          {
            id: "a1",
            role: "assistant",
            metadata: { status: "complete" },
            parts: [
              {
                type: "authorization",
                state: "completed",
                name: "github",
                description: "Sign in to GitHub",
                displayName: "GitHub",
                stepIndex: 0,
                turnId: "turn_1",
                outcome: "authorized",
              },
              { type: "text", text: "Done" },
            ],
          },
        ],
      } satisfies EveMessageData;

      const [message] = convertEveMessages(data, { isRunning: false });

      expect(message?.status).toEqual({ type: "complete", reason: "stop" });
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
          meta: eventMeta(0),
          data: { turnId: "turn_1", sequence: 0 },
        },
        {
          type: "step.started",
          meta: eventMeta(1),
          data: {
            turnId: "turn_1",
            stepIndex: 0,
            sequence: 1,
            modelId: "test-model",
          },
        },
        {
          type: "message.appended",
          meta: eventMeta(2),
          data: {
            turnId: "turn_1",
            stepIndex: 0,
            sequence: 2,
            messageDelta: "Let me th",
            messageSoFar: "Let me th",
          },
        },
      ];

      it("carries the challenge Eve projects onto an authorization part", () => {
        const state = replay([
          ...midStreamEvents,
          {
            type: "authorization.required",
            meta: eventMeta(3),
            data: {
              turnId: "turn_1",
              stepIndex: 0,
              sequence: 3,
              name: "github",
              description: "Authorization required for github",
              authorization: {
                displayName: "GitHub",
                instructions: "Enter the code on the device page",
                url: "https://github.com/login/device",
                userCode: "ABCD-1234",
                expiresAt: "2026-01-01T00:00:00Z",
              },
            },
          },
        ]);

        const converted = convertEveMessages(state, { isRunning: false });

        expect(converted.at(-1)?.content).toContainEqual({
          type: "data",
          name: "authorization",
          data: {
            state: "required",
            name: "github",
            displayName: "GitHub",
            description: "Authorization required for GitHub",
            url: "https://github.com/login/device",
            userCode: "ABCD-1234",
            instructions: "Enter the code on the device page",
            expiresAt: "2026-01-01T00:00:00Z",
          },
        });
      });

      it("releases the hold when Eve settles the authorization part in place", () => {
        const state = replay([
          ...midStreamEvents,
          {
            type: "authorization.required",
            meta: eventMeta(3),
            data: {
              turnId: "turn_1",
              stepIndex: 0,
              sequence: 3,
              name: "github",
              description: "Authorization required for github",
            },
          },
          {
            type: "authorization.completed",
            meta: eventMeta(4),
            data: {
              turnId: "turn_1",
              stepIndex: 0,
              sequence: 4,
              name: "github",
              outcome: "authorized",
            },
          },
        ]);

        const assistant = state.messages.find((m) => m.role === "assistant");
        const authorizationParts = assistant?.parts.filter(
          (part) => part.type === "authorization",
        );
        expect(authorizationParts).toHaveLength(1);
        expect(authorizationParts?.[0]).toMatchObject({ state: "completed" });

        // Eve leaves the streaming marker set, so the released turn falls back
        // to the stale-marker mapping rather than to a terminal status.
        expect(
          convertEveMessages(state, { isRunning: false }).at(-1)?.status,
        ).toEqual({ type: "incomplete", reason: "cancelled" });
      });

      it("keeps the hold while another connector is still required", () => {
        const state = replay([
          ...midStreamEvents,
          {
            type: "authorization.required",
            meta: eventMeta(3),
            data: {
              turnId: "turn_1",
              stepIndex: 0,
              sequence: 3,
              name: "github",
              description: "Authorization required for github",
            },
          },
          {
            type: "authorization.required",
            meta: eventMeta(4),
            data: {
              turnId: "turn_1",
              stepIndex: 0,
              sequence: 4,
              name: "slack",
              description: "Authorization required for slack",
            },
          },
          {
            type: "authorization.completed",
            meta: eventMeta(5),
            data: {
              turnId: "turn_1",
              stepIndex: 0,
              sequence: 5,
              name: "github",
              outcome: "authorized",
            },
          },
        ]);

        expect(
          convertEveMessages(state, { isRunning: false }).at(-1)?.status,
        ).toEqual({ type: "requires-action", reason: "interrupt" });
      });

      it("projects the input request onto the approval part it gates", () => {
        const events: readonly EveAgentReducerEvent[] = [
          ...midStreamEvents,
          {
            type: "input.requested",
            data: {
              turnId: "turn_1",
              stepIndex: 0,
              sequence: 3,
              requests: [
                {
                  requestId: "req_1",
                  prompt: "What should the subject line be?",
                  kind: "question",
                  display: "text",
                  action: {
                    kind: "tool-call",
                    callId: "call_1",
                    toolName: "ask_question",
                    input: {},
                  },
                },
              ],
            },
            meta: eventMeta(3),
          },
        ];

        // Rehydration replays the *stored* event log, which has been through
        // the wire and back, so the reloaded case is the serialized payload
        // rather than the same objects a second time.
        const rehydrated = JSON.parse(
          JSON.stringify(events),
        ) as readonly EveAgentReducerEvent[];

        for (const state of [replay(events), replay(rehydrated)]) {
          const part = state.messages
            .find((message) => message.role === "assistant")
            ?.parts.find((candidate) => candidate.type === "dynamic-tool");

          expect(part).toMatchObject({
            state: "approval-requested",
            approval: { id: "req_1" },
          });
          expect(findEveInputRequest(state, "req_1")).toMatchObject({
            requestId: "req_1",
            prompt: "What should the subject line be?",
            display: "text",
          });
        }
      });

      it("leaves a reasoning part unsettled when a tool call follows it", () => {
        const state = replay([
          ...midStreamEvents.slice(0, 3),
          {
            type: "reasoning.appended",
            meta: eventMeta(2),
            data: {
              turnId: "turn_1",
              stepIndex: 0,
              sequence: 2,
              reasoningDelta: "Think",
              reasoningSoFar: "Think",
            },
          },
          {
            type: "actions.requested",
            meta: eventMeta(3),
            data: {
              turnId: "turn_1",
              stepIndex: 0,
              sequence: 3,
              actions: [
                {
                  kind: "tool-call",
                  callId: "call_1",
                  toolName: "search",
                  input: {},
                },
              ],
            },
          },
        ]);

        const message = state.messages.find((m) => m.role === "assistant");
        expect(message?.parts).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ type: "reasoning", state: "streaming" }),
            expect.objectContaining({ type: "dynamic-tool" }),
          ]),
        );

        const content = convertEveMessages(state, { isRunning: true }).at(
          -1,
        )?.content;
        expect(content).toEqual([
          expect.objectContaining({ type: "reasoning" }),
          expect.objectContaining({ type: "tool-call" }),
        ]);
        expect(content?.[0]).not.toHaveProperty("status");
      });

      it("settles leftover reasoning after the model stream completes a tool call", () => {
        const state = replay([
          ...midStreamEvents.slice(0, 3),
          {
            type: "reasoning.appended",
            meta: eventMeta(2),
            data: {
              turnId: "turn_1",
              stepIndex: 0,
              sequence: 2,
              reasoningDelta: "Think",
              reasoningSoFar: "Think",
            },
          },
          {
            type: "actions.requested",
            meta: eventMeta(3),
            data: {
              turnId: "turn_1",
              stepIndex: 0,
              sequence: 3,
              actions: [
                {
                  kind: "tool-call",
                  callId: "call_1",
                  toolName: "search",
                  input: {},
                },
              ],
            },
          },
          {
            type: "reasoning.completed",
            meta: eventMeta(4),
            data: {
              turnId: "turn_1",
              stepIndex: 0,
              sequence: 4,
              reasoning: "Think",
            },
          },
        ]);

        const message = state.messages.find((m) => m.role === "assistant");
        expect(message?.parts).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ type: "reasoning", state: "done" }),
            expect.objectContaining({ type: "dynamic-tool" }),
          ]),
        );

        const content = convertEveMessages(state, { isRunning: true }).at(
          -1,
        )?.content;
        expect(content).toEqual([
          expect.objectContaining({
            type: "reasoning",
            status: { type: "complete" },
          }),
          expect.objectContaining({ type: "tool-call" }),
        ]);
      });

      it("keeps a later step's live text part unsettled after an earlier step completed", () => {
        const state = replay([
          ...midStreamEvents.slice(0, 3),
          {
            type: "message.appended",
            meta: eventMeta(2),
            data: {
              turnId: "turn_1",
              stepIndex: 0,
              sequence: 2,
              messageDelta: "First",
              messageSoFar: "First",
            },
          },
          {
            type: "message.completed",
            meta: eventMeta(3),
            data: {
              turnId: "turn_1",
              stepIndex: 0,
              sequence: 3,
              finishReason: "tool-calls",
              message: "First",
            },
          },
          {
            type: "step.completed",
            meta: eventMeta(4),
            data: {
              turnId: "turn_1",
              stepIndex: 0,
              sequence: 4,
              finishReason: "tool-calls",
            },
          },
          {
            type: "step.started",
            meta: eventMeta(5),
            data: {
              turnId: "turn_1",
              stepIndex: 1,
              sequence: 5,
              modelId: "test-model",
            },
          },
          {
            type: "message.appended",
            meta: eventMeta(6),
            data: {
              turnId: "turn_1",
              stepIndex: 1,
              sequence: 6,
              messageDelta: "Sec",
              messageSoFar: "Sec",
            },
          },
        ]);

        const assistant = state.messages.find((m) => m.role === "assistant");
        expect(assistant?.parts).toEqual([
          expect.objectContaining({ type: "step-start" }),
          expect.objectContaining({
            type: "text",
            text: "First",
            state: "done",
          }),
          expect.objectContaining({ type: "step-start" }),
          expect.objectContaining({
            type: "text",
            text: "Sec",
            state: "streaming",
          }),
        ]);

        const content = convertEveMessages(state, { isRunning: true }).at(
          -1,
        )?.content;
        expect(content).toEqual([
          expect.objectContaining({
            type: "text",
            text: "First",
            status: { type: "complete" },
          }),
          expect.objectContaining({ type: "text", text: "Sec" }),
        ]);
        expect(content?.[1]).not.toHaveProperty("status");
      });

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
            meta: eventMeta(3),
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
            meta: eventMeta(3),
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
            meta: eventMeta(3),
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
            meta: eventMeta(4),
            data: { turnId: "turn_1", sequence: 4 },
          },
        ]);

        const assistant = state.messages.find((m) => m.role === "assistant");
        expect(assistant?.metadata?.status).toBe("complete");
        expect(assistant?.parts).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ type: "text", state: "done" }),
          ]),
        );

        const converted = convertEveMessages(state, { isRunning: false });
        expect(converted.at(-1)?.status).toEqual({
          type: "complete",
          reason: "stop",
        });
        expect(converted.at(-1)?.content).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: "text",
              status: { type: "complete" },
            }),
          ]),
        );
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

const approveCancel = [
  { id: "approve", label: "Approve" },
  { id: "cancel", label: "Cancel" },
];
const environments = [
  { id: "staging", label: "Staging" },
  { id: "production", label: "Production" },
];

const withInputRequest = (
  overrides: Partial<EveMessageInputRequest> = {},
): EveMessageInputRequest => ({
  requestId: "req_1",
  prompt: "Send the email?",
  kind: "question",
  ...overrides,
});

describe("toEveInputResponse", () => {
  it("maps assistant-ui approval responses to eve input responses", () => {
    expect(
      toEveInputResponse(
        {
          approvalId: "req_1",
          approved: false,
          reason: "Not yet",
        },
        withInputRequest({ display: "confirmation", options: approveCancel }),
      ),
    ).toEqual({
      requestId: "req_1",
      optionId: "cancel",
      text: "Not yet",
    });
  });

  it("keeps the shipped one-argument mapping when no request is available", () => {
    expect(toEveInputResponse({ approvalId: "req_1", approved: true })).toEqual(
      {
        requestId: "req_1",
        optionId: "approve",
      },
    );

    expect(
      toEveInputResponse({
        approvalId: "req_1",
        approved: false,
        reason: "Not yet",
      }),
    ).toEqual({ requestId: "req_1", optionId: "cancel", text: "Not yet" });

    expect(
      toEveInputResponse({
        approvalId: "req_1",
        approved: true,
        optionId: "staging",
      }),
    ).toEqual({ requestId: "req_1", optionId: "staging" });
  });

  it("keeps the confirmation mapping when the request carries approve/cancel options", () => {
    expect(
      toEveInputResponse(
        { approvalId: "req_1", approved: true },
        withInputRequest({ display: "confirmation", options: approveCancel }),
      ),
    ).toEqual({ requestId: "req_1", optionId: "approve" });
  });

  it("maps a select response to the chosen option id", () => {
    expect(
      toEveInputResponse(
        { approvalId: "req_1", approved: true, optionId: "staging" },
        withInputRequest({ display: "select", options: environments }),
      ),
    ).toEqual({ requestId: "req_1", optionId: "staging" });
  });

  it.each([
    ["a text display", { display: "text", allowFreeform: true }],
    ["allowFreeform and no options", { allowFreeform: true }],
    ["neither a display nor allowFreeform", {}],
    [
      "a select display that allows freeform",
      { display: "select", allowFreeform: true, options: environments },
    ],
  ] satisfies [string, Partial<EveMessageInputRequest>][])(
    "answers a request with %s as free-form text, not a fabricated option id",
    (_label, overrides) => {
      const response = toEveInputResponse(
        { approvalId: "req_1", approved: true, reason: "Quarterly results" },
        withInputRequest(overrides),
      );

      expect(response).toEqual({
        requestId: "req_1",
        text: "Quarterly results",
      });
      expect(response).not.toHaveProperty("optionId");
    },
  );

  it("keeps a denial off the free-form path, which carries no answer", () => {
    expect(() =>
      toEveInputResponse(
        { approvalId: "req_1", approved: false, reason: "not this one" },
        withInputRequest(),
      ),
    ).toThrow(/a refusal carries no answer for a free-form request/);
  });

  it("never fabricates approve for a text-display request without an answer", () => {
    expect(() =>
      toEveInputResponse(
        { approvalId: "req_1", approved: true },
        withInputRequest({ display: "text" }),
      ),
    ).toThrow(/pass the answer as the response reason/);
  });

  it("never fabricates approve for a select request without a chosen option", () => {
    expect(() =>
      toEveInputResponse(
        { approvalId: "req_1", approved: true },
        withInputRequest({ display: "select", options: environments }),
      ),
    ).toThrow(/respond with one of: staging, production/);
  });

  it("throws when the response names an option the request does not carry", () => {
    expect(() =>
      toEveInputResponse(
        { approvalId: "req_1", approved: false, optionId: "sandbox" },
        withInputRequest({ display: "select", options: environments }),
      ),
    ).toThrow(/no option with id "sandbox".*staging, production/s);

    // A named option the request does not carry outranks the decision, even
    // when the decision names an option the request does carry: substituting
    // the literal deny here would discard the choice the caller made.
    expect(() =>
      toEveInputResponse(
        { approvalId: "req_1", approved: false, optionId: "schedule-later" },
        withInputRequest({ display: "confirmation", options: approveCancel }),
      ),
    ).toThrow(/no option with id "schedule-later"/);
  });

  it("prefers a literal approve option over the free-form path on a text-display request", () => {
    const inputRequest = withInputRequest({
      display: "text",
      options: approveCancel,
    });

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

  it("answers a tool-approval by kind even when its options are missing", () => {
    const inputRequest = withInputRequest({
      kind: "tool-approval",
      display: "confirmation",
    });

    expect(
      toEveInputResponse({ approvalId: "req_1", approved: true }, inputRequest),
    ).toEqual({ requestId: "req_1", optionId: "approve" });

    expect(
      toEveInputResponse(
        { approvalId: "req_1", approved: false, reason: "not now" },
        inputRequest,
      ),
    ).toEqual({ requestId: "req_1", optionId: "cancel", text: "not now" });
  });

  it("still requires a declared option when a tool-approval carries its own", () => {
    const inputRequest = withInputRequest({
      kind: "tool-approval",
      display: "confirmation",
      options: [{ id: "schedule-later", label: "Schedule later" }],
    });

    expect(() =>
      toEveInputResponse({ approvalId: "req_1", approved: true }, inputRequest),
    ).toThrow(/respond with one of: schedule-later/);

    expect(
      toEveInputResponse(
        { approvalId: "req_1", approved: true, optionId: "schedule-later" },
        inputRequest,
      ),
    ).toEqual({ requestId: "req_1", optionId: "schedule-later" });
  });

  it("never answers an optionless confirmation as free-form text", () => {
    const inputRequest = withInputRequest({ display: "confirmation" });

    for (const response of [
      { approvalId: "req_1", approved: true },
      { approvalId: "req_1", approved: false, reason: "not now" },
      { approvalId: "req_1", approved: true, reason: "go ahead" },
    ]) {
      expect(() => toEveInputResponse(response, inputRequest)).toThrow(
        /declares no options to respond with/,
      );
    }
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
                  kind: "question",
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

  it.each([
    ["carries no input request", { eve: { kind: "tool-call", name: "ask" } }],
    ["carries no eve tool metadata at all", undefined],
  ])("returns undefined when the matching part %s", (_label, toolMetadata) => {
    const part = { ...data.messages[0]!.parts[0]!, toolMetadata };
    const bare = { messages: [{ ...data.messages[0]!, parts: [part] }] };

    expect(
      findEveInputRequest(bare as EveMessageData, "req_1"),
    ).toBeUndefined();
  });
});

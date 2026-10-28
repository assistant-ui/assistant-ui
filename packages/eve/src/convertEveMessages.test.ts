import { describe, expect, it } from "vitest";
import type { EveInteractionPart, EveToolPart, Interaction } from "eve/react";
import {
  conversationOf,
  type ConversationState,
  type SessionEvent,
  type SessionStreamEvent,
} from "eve/client";
import {
  collectInterruptedTurnEvents,
  convertEveMessage,
  convertEveMessages,
  type InterruptedTurnEventCache,
  findEveInputRequest,
  getEveMessageContent,
  toEveInputResponse,
} from "./convertEveMessages";
import type { AppendMessage } from "@assistant-ui/core";

type MessageData = Pick<ConversationState, "messages">;
type InputRequest = Interaction["request"];

const approvalInteraction = (
  request: InputRequest = { kind: "approval", prompt: "Send the email?" },
): Interaction => ({
  interactionId: "req_1",
  turnId: "turn_1",
  stepIndex: 0,
  status: "open",
  request,
  call: { callId: "call_1", name: "send_email", input: {} },
});

const toolPart = (
  overrides: {
    state?: "requested" | "approval" | "rejected";
    input?: unknown;
    interaction?: Interaction;
    name?: string;
    label?: string;
  } = {},
): Exclude<EveToolPart, { state: "streaming" }> => ({
  type: "tool",
  callId: "call_1",
  stepIndex: 0,
  kind: "tool",
  name: "send_email",
  label: "send_email",
  state: overrides.interaction ? "approval" : "requested",
  input: {},
  ...overrides,
});

const signInPart = (
  request: InputRequest,
  overrides: Partial<Interaction> = {},
): EveInteractionPart => ({
  type: "interaction",
  interactionId: "auth_1",
  turnId: "turn_1",
  stepIndex: 0,
  status: "open",
  request,
  ...overrides,
});

const withApprovalPart = (request?: InputRequest): MessageData => ({
  messages: [
    {
      id: "a1",
      role: "assistant",
      parts: [toolPart({ interaction: approvalInteraction(request) })],
    },
  ],
});

const eventMeta = (sequence: number) => ({
  at: "2026-01-01T00:00:00.000Z",
  position: { line: sequence, index: 0 },
});

const replay = (events: readonly SessionEvent[]) =>
  conversationOf(
    events.map((event, index) => ({ ...event, meta: eventMeta(index) })),
  );

const initialTurnEvents = [
  { type: "session.started", data: {} },
  { type: "delivery.admitted", data: { deliveryId: "delivery_1" } },
  {
    type: "turn.started",
    data: {
      turnId: "turn_1",
      cause: { deliveryId: "delivery_1" },
      follows: null,
    },
  },
  {
    type: "delivery.consumed",
    data: {
      deliveryId: "delivery_1",
      turnId: "turn_1",
      parts: [{ kind: "text", text: "hi" }],
    },
  },
  {
    type: "model.requested",
    scope: { turnId: "turn_1" },
    data: { runId: "run_1", owner: { turnId: "turn_1" } },
  },
  {
    type: "model.started",
    scope: { turnId: "turn_1", runId: "run_1" },
    data: { runId: "run_1", modelId: "test-model", attempt: 0 },
  },
] as const satisfies readonly SessionEvent[];

const signInOpened = (
  name: string,
  signIn: Partial<NonNullable<InputRequest["signIn"]>> = {},
): SessionEvent => ({
  type: "interaction.opened",
  scope: { turnId: "turn_1" },
  data: {
    interactionId: `auth_${name}`,
    subject: { turnId: "turn_1" },
    request: {
      kind: "sign-in",
      prompt: `Authorization required for ${signIn.displayName ?? name}`,
      signIn: { name, ...signIn },
    },
  },
});

describe("convertEveMessages", () => {
  it("converts a single completed message with default options", () => {
    const message = {
      id: "a1",
      role: "assistant",
      parts: [{ type: "text", text: "Hello" }],
    } as const satisfies MessageData["messages"][number];

    expect(convertEveMessage(message, 0, [message])).toMatchObject({
      id: "a1",
      role: "assistant",
      content: [{ type: "text", text: "Hello" }],
      status: { type: "complete", reason: "stop" },
    });
  });

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
    } satisfies MessageData;

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
    } satisfies MessageData;

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
    } satisfies MessageData;

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
    } satisfies MessageData;

    const messages = convertEveMessages(data);

    for (const part of messages[0]!.content) {
      expect(part).not.toHaveProperty("status");
    }
  });

  it("converts tool parts with approval options", () => {
    const data = {
      messages: [
        {
          id: "a1",
          role: "assistant",
          parts: [
            toolPart({
              input: { to: "dev@example.com" },
              interaction: approvalInteraction({
                kind: "approval",
                prompt: "Send the email?",
                display: "confirmation",
                options: [
                  { id: "approve", label: "Approve" },
                  { id: "cancel", label: "Cancel", style: "danger" },
                  { id: "escalate", label: "Escalate" },
                ],
              }),
            }),
          ],
        },
      ],
    } satisfies MessageData;

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
              { id: "cancel", kind: "_cancel", label: "Cancel" },
              { id: "escalate", kind: "_escalate", label: "Escalate" },
            ],
          },
        },
      ],
    });
  });

  it("keeps streaming tool args incomplete until input is available", () => {
    const streamingData = {
      messages: [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              type: "tool",
              state: "streaming",
              callId: "call_1",
              stepIndex: 0,
              kind: "tool",
              name: "search",
              label: "search",
              inputText: "",
            },
          ],
        },
      ],
    } satisfies MessageData;

    const [streamingMessage] = convertEveMessages(streamingData);

    expect(streamingMessage?.content[0]).toMatchObject({
      type: "tool-call",
      args: {},
      argsText: "",
    });

    const availableData = {
      messages: [
        {
          id: "a1",
          role: "assistant",
          parts: [
            toolPart({
              name: "search",
              label: "search",
              input: { query: "badge" },
            }),
          ],
        },
      ],
    } satisfies MessageData;

    const [availableMessage] = convertEveMessages(availableData);

    expect(availableMessage?.content[0]).toMatchObject({
      type: "tool-call",
      args: { query: "badge" },
      argsText: '{"query":"badge"}',
    });
  });

  it.each([
    [
      "a confirmation request",
      {
        kind: "approval",
        prompt: "Send the email?",
        display: "confirmation",
        options: [
          { id: "approve", label: "Approve" },
          { id: "cancel", label: "Cancel" },
        ],
      },
      { prompt: "Send the email?", display: "decision" },
    ],
    [
      "a select question that also takes a typed answer",
      {
        kind: "question",
        prompt: "Which environment?",
        display: "select",
        allowFreeform: true,
        options: [{ id: "staging", label: "Staging" }],
      },
      {
        prompt: "Which environment?",
        display: "select",
        allowFreeform: true,
      },
    ],
    [
      "a text question",
      {
        kind: "question",
        prompt: "What should the subject line be?",
        display: "text",
      },
      {
        prompt: "What should the subject line be?",
        display: "text",
        allowFreeform: true,
      },
    ],
    [
      "a question with neither a display nor options",
      { kind: "question", prompt: "Anything else?" },
      { prompt: "Anything else?", display: "text", allowFreeform: true },
    ],
  ] satisfies [string, InputRequest, object][])(
    "describes %s on the approval itself",
    (_label, inputRequest, expected) => {
      const [message] = convertEveMessages(withApprovalPart(inputRequest));

      expect(message!.content[0]).toMatchObject({ approval: expected });
    },
  );

  it.each([
    ["no display", undefined],
    ["a text display", "text" as const],
    ["a select display", "select" as const],
  ])(
    "projects a tool approval whose options were dropped as a decision, with %s",
    (_label, display) => {
      const [message] = convertEveMessages(
        withApprovalPart({
          kind: "approval",
          prompt: "Send the email?",
          ...(display && { display }),
        }),
      );

      expect(message!.content[0]).toMatchObject({
        approval: { display: "decision" },
      });
      expect(
        (message!.content[0] as { approval?: object }).approval,
      ).not.toHaveProperty("allowFreeform");
    },
  );

  it("does not offer a typed answer on a tool approval whose options were dropped", () => {
    const [message] = convertEveMessages(
      withApprovalPart({
        kind: "approval",
        prompt: "Send the email?",
      }),
    );

    // The mapper answers this shape with its approve/cancel branch before it
    // ever reads a text answer, so the renderer must not offer one.
    expect(
      (message!.content[0] as { approval?: object }).approval,
    ).not.toHaveProperty("allowFreeform");
  });

  it("does not offer a typed answer on a confirmation request", () => {
    const [message] = convertEveMessages(
      withApprovalPart({
        kind: "approval",
        prompt: "Send the email?",
        display: "confirmation",
        options: [
          { id: "approve", label: "Approve" },
          { id: "cancel", label: "Cancel" },
        ],
      }),
    );

    expect(
      (message!.content[0] as { approval?: object }).approval,
    ).not.toHaveProperty("allowFreeform");
  });

  it.each([
    [
      "the full input request",
      {
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
        prompt: "What should the subject line be?",
        kind: "question",
      },
    ],
  ] satisfies [string, InputRequest][])(
    "projects %s onto providerMetadata.eve",
    (_label, inputRequest) => {
      const [message] = convertEveMessages(withApprovalPart(inputRequest));
      const part = message!.content[0];

      expect(part).toMatchObject({ type: "tool-call" });
      expect((part as { providerMetadata?: unknown }).providerMetadata).toEqual(
        {
          eve: { interaction: { interactionId: "req_1", ...inputRequest } },
        },
      );
    },
  );

  it("omits providerMetadata for a tool part without an interaction", () => {
    const [message] = convertEveMessages({
      messages: [{ id: "a1", role: "assistant", parts: [toolPart()] }],
    });

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
              ...toolPart({
                state: "rejected",
                input: { to: "dev@example.com" },
                interaction: {
                  ...approvalInteraction(),
                  status: "settled",
                  outcome: "declined",
                },
              }),
            },
          ],
        },
      ],
    } satisfies MessageData;

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

  it.each([
    ["completed", { answer: "sent" }, { answer: "sent" }, false],
    ["failed", undefined, { error: "Tool call failed" }, true],
    ["cancelled", undefined, { error: "Tool call cancelled" }, true],
  ] as const)(
    "maps a %s tool call to its result and error state",
    (state, output, result, isError) => {
      const [message] = convertEveMessages({
        messages: [
          {
            id: "a1",
            role: "assistant",
            parts: [{ ...toolPart(), state, output }],
          },
        ],
      });

      expect(message?.content[0]).toMatchObject({ type: "tool-call", result });
      expect(Object.hasOwn(message?.content[0] ?? {}, "isError")).toBe(isError);
      expect(message?.content[0]).toMatchObject(isError ? { isError } : {});
    },
  );

  it("uses a failed tool's error before its interaction reason", () => {
    const [message] = convertEveMessages({
      messages: [
        {
          id: "a1",
          role: "assistant",
          parts: [
            {
              ...toolPart({
                interaction: { ...approvalInteraction(), reason: "Denied" },
              }),
              state: "failed",
              error: { code: "internal", message: "Service unavailable" },
            },
          ],
        },
      ],
    });

    expect(message?.content[0]).toMatchObject({
      result: { error: "Service unavailable" },
      isError: true,
    });
  });

  it("exposes preliminary tool output before the call settles", () => {
    const [message] = convertEveMessages({
      messages: [
        {
          id: "a1",
          role: "assistant",
          parts: [{ ...toolPart({ input: ["first"] }), output: "partial" }],
        },
      ],
    });

    expect(message?.content[0]).toMatchObject({
      args: { value: ["first"] },
      argsText: '["first"]',
      result: "partial",
      isPreliminary: true,
    });
  });

  it.each([
    [
      "accepted",
      { approved: true, optionId: "approve", text: "Proceed" },
      false,
    ],
    ["declined", { approved: false, optionId: "deny", text: "Later" }, true],
    ["expired", { resolution: "expired" }, true],
    ["withdrawn", { resolution: "cancelled" }, true],
  ] as const)(
    "projects a settled %s interaction with its answer or resolution",
    (outcome, approval, isError) => {
      const interaction = signInPart(
        { kind: "question", prompt: "Proceed?", options: approveCancel },
        {
          status: "settled",
          outcome,
          reason: "Session finished",
          ...(outcome === "accepted" || outcome === "declined"
            ? {
                answer: {
                  interactionId: "auth_1",
                  optionId: outcome === "accepted" ? "approve" : "deny",
                  text: outcome === "accepted" ? "Proceed" : "Later",
                },
              }
            : {}),
        },
      );
      const [message] = convertEveMessages({
        messages: [{ id: "a1", role: "assistant", parts: [interaction] }],
      });

      expect(message?.content[0]).toMatchObject({
        type: "tool-call",
        toolName: "question",
        approval: { ...approval, reason: "Session finished" },
      });
      expect(Object.hasOwn(message?.content[0] ?? {}, "isError")).toBe(isError);
      expect(message?.content[0]).toMatchObject(isError ? { isError } : {});
      expect(message?.content[0]).toHaveProperty(
        "result",
        outcome === "accepted" || outcome === "declined"
          ? {
              interactionId: "auth_1",
              optionId: outcome === "accepted" ? "approve" : "deny",
              text: outcome === "accepted" ? "Proceed" : "Later",
            }
          : { outcome, reason: "Session finished" },
      );
    },
  );

  it.each([
    ["declined", "declined"],
    ["invalid", "declined"],
    ["expired", "timed-out"],
    ["failed", "failed"],
    ["withdrawn", "cancelled"],
  ] as const)("maps a %s sign-in to %s", (outcome, mapped) => {
    const [message] = convertEveMessages({
      messages: [
        {
          id: "a1",
          role: "assistant",
          parts: [
            signInPart(
              { kind: "sign-in", prompt: "Connect", title: "Account" },
              { status: "settled", outcome, reason: "Session finished" },
            ),
          ],
        },
      ],
    });

    expect(message?.content[0]).toEqual({
      type: "data",
      name: "authorization",
      data: {
        state: "completed",
        name: "Account",
        description: "Connect",
        outcome: mapped,
        reason: "Session finished",
      },
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
    } satisfies MessageData;

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
    } satisfies MessageData;

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
    } satisfies MessageData;

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
    } satisfies MessageData;

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
    } satisfies MessageData;

    const [message] = convertEveMessages(data);

    expect(message?.content).toEqual([{ type: "text", text: "Hello" }]);
  });

  it("converts a user file part into a file attachment and keeps it out of content", () => {
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
    } satisfies MessageData;

    const [message] = convertEveMessages(data);

    expect(message?.content).toEqual([
      { type: "text", text: "See the report" },
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
    } satisfies MessageData;

    const [message] = convertEveMessages(data);

    expect(message?.content).toEqual([]);
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
    } satisfies MessageData;

    const [message] = convertEveMessages(data);

    expect(message?.content).toEqual([]);
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
    } satisfies MessageData;

    const [message] = convertEveMessages(data);

    expect(message?.attachments?.map((a) => [a.id, a.type])).toEqual([
      ["0", "file"],
      ["1", "image"],
    ]);
  });

  it("prefers an explicit mediaType over the data URL declaration", () => {
    const data = {
      messages: [
        {
          id: "u1",
          role: "user",
          parts: [
            {
              type: "file",
              url: "data:application/octet-stream;base64,JVBERi0=",
              mediaType: "application/pdf",
            },
          ],
        },
      ],
    } satisfies MessageData;

    const [message] = convertEveMessages(data);

    expect(message?.attachments?.[0]).toMatchObject({
      type: "file",
      contentType: "application/pdf",
    });
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
    } satisfies MessageData;

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

  it("drops a URL-less assistant file part while retaining text", () => {
    const data = {
      messages: [
        {
          id: "a1",
          role: "assistant",
          parts: [
            { type: "file", mediaType: "application/pdf" },
            { type: "text", text: "Done" },
          ],
        },
      ],
    } satisfies MessageData;

    const [message] = convertEveMessages(data);

    expect(message?.content).toEqual([{ type: "text", text: "Done" }]);
  });

  it("drops non-convertible part types instead of throwing", () => {
    const data = {
      messages: [
        {
          id: "a1",
          role: "assistant",
          parts: [
            { type: "future-part", payload: {} },
            { type: "text", text: "Done" },
          ],
        },
      ],
    } as unknown as MessageData;

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
            signInPart({
              kind: "sign-in",
              prompt: "Sign in to GitHub",
              signIn: {
                name: "github",
                displayName: "GitHub",
                instructions: "Enter the code on the device page",
                url: "https://github.com/login/device",
                userCode: "ABCD-1234",
                expiresAt: "2026-01-01T00:00:00Z",
              },
            }),
          ],
        },
      ],
    } satisfies MessageData;

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
            signInPart({
              kind: "sign-in",
              prompt: "",
              signIn: { name: "github" },
            }),
          ],
        },
      ],
    } satisfies MessageData;

    const [message] = convertEveMessages(data);

    expect(message?.content).toEqual([
      {
        type: "data",
        name: "authorization",
        data: { state: "required", name: "github", description: "" },
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
            signInPart({
              kind: "sign-in",
              prompt: "",
              signIn: {
                name: "github",
                url: "javascript:alert(1)",
                userCode: "ABCD-1234",
              },
            }),
          ],
        },
      ],
    } satisfies MessageData;

    const [message] = convertEveMessages(data);

    expect(message?.content).toEqual([
      {
        type: "data",
        name: "authorization",
        data: {
          state: "required",
          name: "github",
          description: "",
          userCode: "ABCD-1234",
        },
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
            signInPart(
              {
                kind: "sign-in",
                prompt: "Sign in to GitHub",
                signIn: { name: "github", displayName: "GitHub" },
              },
              { status: "settled", outcome: "accepted" },
            ),
          ],
        },
      ],
    } satisfies MessageData;

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
    ): MessageData => ({
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
      } satisfies MessageData;

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

    it("keeps a failed turn incomplete when the event has no error detail", () => {
      const failure = {
        type: "turn.settled",
        data: { turnId: "turn_1", outcome: "failed" },
        meta: eventMeta(1),
      } as const satisfies SessionStreamEvent;
      const [message] = convertEveMessages(
        {
          messages: [
            {
              id: "a1",
              role: "assistant",
              metadata: { turnId: "turn_1", status: "complete" },
              parts: [{ type: "text", text: "Partial response" }],
            },
          ],
        },
        { events: [failure] },
      );

      expect(message?.status).toEqual({ type: "incomplete", reason: "error" });
    });

    it("scopes session failures to their turn and gives them precedence over turn cancellation", () => {
      const events = [
        {
          type: "turn.settled",
          data: { turnId: "turn_1", outcome: "cancelled" },
          meta: eventMeta(1),
        },
        {
          type: "session.ended",
          data: { outcome: "failed", cause: { turnId: "turn_1" } },
          meta: eventMeta(2),
        },
      ] as const satisfies readonly SessionStreamEvent[];
      const messages = convertEveMessages(
        {
          messages: [
            {
              id: "a1",
              role: "assistant",
              metadata: { turnId: "turn_1" },
              parts: [{ type: "text", text: "First" }],
            },
            {
              id: "a2",
              role: "assistant",
              metadata: { turnId: "turn_2" },
              parts: [{ type: "text", text: "Second" }],
            },
          ],
        },
        { events, isRunning: false },
      );

      expect(messages.map((message) => message.status)).toEqual([
        { type: "incomplete", reason: "error" },
        { type: "complete", reason: "stop" },
      ]);
    });

    it.each([
      ["completed", { outcome: "completed" }],
      ["failed without a cause", { outcome: "failed" }],
      [
        "failed outside a turn",
        { outcome: "failed", cause: { deliveryId: "delivery_1" } },
      ],
    ] as const)(
      "does not assign a %s session ending to a turn",
      (_label, data) => {
        const event = {
          type: "session.ended",
          data,
          meta: eventMeta(1),
        } as const satisfies SessionStreamEvent;
        const [message] = convertEveMessages(
          {
            messages: [
              {
                id: "a1",
                role: "assistant",
                metadata: { turnId: "turn_1" },
                parts: [{ type: "text", text: "Done" }],
              },
            ],
          },
          { events: [event], isRunning: false },
        );

        expect(message?.status).toEqual({ type: "complete", reason: "stop" });
      },
    );

    it("keeps requires-action for pending approvals when not running", () => {
      const data = {
        messages: [
          {
            id: "a1",
            role: "assistant",
            metadata: { status: "streaming" },
            parts: [toolPart({ interaction: approvalInteraction() })],
          },
        ],
      } satisfies MessageData;

      const message = convertEveMessages(data, { isRunning: false }).at(-1);

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
              signInPart({
                kind: "sign-in",
                prompt: "Sign in to GitHub",
                signIn: { name: "github", displayName: "GitHub" },
              }),
            ],
          },
        ],
      } satisfies MessageData;

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
              toolPart({ interaction: approvalInteraction() }),
              signInPart({
                kind: "sign-in",
                prompt: "Sign in to GitHub",
                signIn: { name: "github", displayName: "GitHub" },
              }),
            ],
          },
        ],
      } satisfies MessageData;

      const [message] = convertEveMessages(data, { isRunning: false });

      expect(message?.status).toEqual({
        type: "requires-action",
        reason: "tool-calls",
      });
    });

    it("settles a cancelled turn with a pending authorization", () => {
      const events = [...initialTurnEvents, signInOpened("github")];
      const pendingData = replay(events);
      const pendingAssistant = pendingData.messages.find(
        (message) => message.role === "assistant",
      );
      expect(pendingAssistant?.metadata?.status).toBe("streaming");
      expect(
        convertEveMessages(pendingData, { isRunning: false }).at(-1)?.status,
      ).toEqual({ type: "requires-action", reason: "interrupt" });

      const data = replay([
        ...events,
        {
          type: "turn.settled",
          data: { turnId: "turn_1", outcome: "cancelled" },
        },
      ]);
      const message = convertEveMessages(data, { isRunning: false }).at(-1);

      expect(message?.status).toEqual({ type: "complete", reason: "stop" });
    });

    it("reports a failed turn with a pending authorization", () => {
      const data = {
        messages: [
          {
            id: "a1",
            role: "assistant",
            metadata: { status: "streaming" },
            parts: [
              signInPart({
                kind: "sign-in",
                prompt: "Sign in to GitHub",
                signIn: { name: "github", displayName: "GitHub" },
              }),
            ],
          },
        ],
      } satisfies MessageData;

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
              signInPart({
                kind: "sign-in",
                prompt: "Sign in to GitHub",
                signIn: { name: "github", displayName: "GitHub" },
              }),
            ],
          },
          {
            id: "a2",
            role: "assistant",
            metadata: { status: "streaming" },
            parts: [{ type: "text", text: "Later turn" }],
          },
        ],
      } satisfies MessageData;

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
              signInPart(
                {
                  kind: "sign-in",
                  prompt: "Sign in to GitHub",
                  signIn: { name: "github", displayName: "GitHub" },
                },
                { status: "settled", outcome: "accepted" },
              ),
              { type: "text", text: "Done" },
            ],
          },
        ],
      } satisfies MessageData;

      const [message] = convertEveMessages(data, { isRunning: false });

      expect(message?.status).toEqual({ type: "complete", reason: "stop" });
    });

    describe("contract with eve's conversation projection", () => {
      const midStreamEvents: readonly SessionEvent[] = [
        ...initialTurnEvents,
        {
          type: "content.delta",
          scope: { turnId: "turn_1", runId: "run_1" },
          data: { partId: "part_1", kind: "text", delta: "Let me th" },
        },
      ];

      const completedContent = (
        kind: "text" | "reasoning",
        partId: string,
        value: string,
        runId = "run_1",
      ): SessionEvent => ({
        type: "content.completed",
        scope: { turnId: "turn_1", runId },
        data: { partId, runId, kind, value, phase: "narration" },
      });

      const callRequested = {
        type: "call.requested",
        scope: { turnId: "turn_1", runId: "run_1" },
        data: {
          callId: "call_1",
          owner: { runId: "run_1" },
          capability: { kind: "tool", name: "search" },
          input: {},
        },
      } as const satisfies SessionEvent;

      it("carries the challenge Eve projects onto an authorization part", () => {
        const state = replay([
          ...midStreamEvents,
          signInOpened("github", {
            displayName: "GitHub",
            instructions: "Enter the code on the device page",
            url: "https://github.com/login/device",
            userCode: "ABCD-1234",
            expiresAt: "2026-01-01T00:00:00Z",
          }),
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
          signInOpened("github"),
          {
            type: "interaction.settled",
            data: { interactionId: "auth_github", outcome: "accepted" },
          },
        ]);

        const assistant = state.messages.find((m) => m.role === "assistant");
        const authorizationParts = assistant?.parts.filter(
          (part) => part.type === "interaction",
        );
        expect(authorizationParts).toHaveLength(1);
        expect(authorizationParts?.[0]).toMatchObject({ status: "settled" });
        expect(
          convertEveMessages(state, { isRunning: false }).at(-1)?.status,
        ).toEqual({ type: "incomplete", reason: "cancelled" });
      });

      it("keeps the hold while another connector is still required", () => {
        const state = replay([
          ...midStreamEvents,
          signInOpened("github"),
          signInOpened("slack"),
          {
            type: "interaction.settled",
            data: { interactionId: "auth_github", outcome: "accepted" },
          },
        ]);

        expect(
          convertEveMessages(state, { isRunning: false }).at(-1)?.status,
        ).toEqual({ type: "requires-action", reason: "interrupt" });
      });

      it("projects the input request onto the approval part it gates", () => {
        const events: readonly SessionEvent[] = [
          ...midStreamEvents,
          {
            ...callRequested,
            data: {
              ...callRequested.data,
              capability: { kind: "tool", name: "ask_question" },
            },
          },
          {
            type: "interaction.opened",
            scope: { turnId: "turn_1" },
            data: {
              interactionId: "req_1",
              subject: { callId: "call_1" },
              request: {
                kind: "question",
                prompt: "What should the subject line be?",
                display: "text",
              },
            },
          },
        ];
        const rehydrated = JSON.parse(JSON.stringify(events)) as SessionEvent[];

        for (const state of [replay(events), replay(rehydrated)]) {
          const part = state.messages
            .find((message) => message.role === "assistant")
            ?.parts.find((candidate) => candidate.type === "tool");

          expect(part).toMatchObject({
            type: "tool",
            interaction: { interactionId: "req_1", status: "open" },
          });
          expect(findEveInputRequest(state, "req_1")).toMatchObject({
            prompt: "What should the subject line be?",
            display: "text",
          });
        }
      });

      it("leaves a reasoning part unsettled when a tool call follows it", () => {
        const state = replay([
          ...initialTurnEvents,
          {
            type: "content.delta",
            scope: { turnId: "turn_1", runId: "run_1" },
            data: { partId: "reason_1", kind: "reasoning", delta: "Think" },
          },
          callRequested,
        ]);

        const message = state.messages.find((m) => m.role === "assistant");
        expect(message?.parts).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ type: "reasoning", state: "streaming" }),
            expect.objectContaining({ type: "tool" }),
          ]),
        );
        const content = convertEveMessages(state, { isRunning: true }).at(
          -1,
        )?.content;
        expect(content).toEqual([
          expect.objectContaining({ type: "tool-call" }),
          expect.objectContaining({ type: "reasoning" }),
        ]);
        expect(content?.[1]).not.toHaveProperty("status");
      });

      it("settles leftover reasoning after the model stream completes a tool call", () => {
        const state = replay([
          ...initialTurnEvents,
          {
            type: "content.delta",
            scope: { turnId: "turn_1", runId: "run_1" },
            data: { partId: "reason_1", kind: "reasoning", delta: "Think" },
          },
          callRequested,
          completedContent("reasoning", "reason_1", "Think"),
        ]);

        const message = state.messages.find((m) => m.role === "assistant");
        expect(message?.parts).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ type: "reasoning", state: "done" }),
            expect.objectContaining({ type: "tool" }),
          ]),
        );
        const content = convertEveMessages(state, { isRunning: true }).at(
          -1,
        )?.content;
        expect(content).toEqual([
          expect.objectContaining({ type: "tool-call" }),
          expect.objectContaining({
            type: "reasoning",
            status: { type: "complete" },
          }),
        ]);
      });

      it("keeps a later step's live text part unsettled after an earlier step completed", () => {
        const state = replay([
          ...initialTurnEvents,
          {
            type: "content.delta",
            scope: { turnId: "turn_1", runId: "run_1" },
            data: { partId: "part_1", kind: "text", delta: "First" },
          },
          completedContent("text", "part_1", "First"),
          {
            type: "model.settled",
            data: {
              runId: "run_1",
              outcome: "completed",
              finishReason: "tool-calls",
            },
          },
          {
            type: "model.requested",
            scope: { turnId: "turn_1" },
            data: { runId: "run_2", owner: { turnId: "turn_1" } },
          },
          {
            type: "model.started",
            scope: { turnId: "turn_1", runId: "run_2" },
            data: { runId: "run_2", modelId: "test-model", attempt: 0 },
          },
          {
            type: "content.delta",
            scope: { turnId: "turn_1", runId: "run_2" },
            data: { partId: "part_2", kind: "text", delta: "Sec" },
          },
        ]);

        const assistant = state.messages.find((m) => m.role === "assistant");
        expect(assistant?.parts).toEqual([
          expect.objectContaining({
            type: "text",
            text: "First",
            state: "done",
          }),
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
        expect(
          convertEveMessages(state, { isRunning: false }).at(-1)?.status,
        ).toEqual({
          type: "incomplete",
          reason: "cancelled",
        });
      });

      it("a failed session keeps its streaming marker and converts to error", () => {
        const state = replay([
          ...midStreamEvents,
          {
            type: "session.ended",
            data: {
              outcome: "failed",
              cause: { turnId: "turn_1" },
              error: { code: "internal", message: "boom" },
            },
          },
        ]);
        const assistant = state.messages.find((m) => m.role === "assistant");
        expect(assistant?.metadata?.status).toBe("streaming");
        expect(
          convertEveMessages(state, {
            isRunning: false,
            error: new Error("boom"),
          }).at(-1)?.status,
        ).toEqual({
          type: "incomplete",
          reason: "error",
          error: { code: "unknown", message: "boom" },
        });
      });

      it("a failed turn stays incomplete after Eve settles its message", () => {
        const failureEvent = {
          type: "turn.settled",
          meta: eventMeta(8),
          data: {
            turnId: "turn_1",
            outcome: "failed",
            error: { code: "internal", message: "boom" },
          },
        } as const satisfies SessionStreamEvent;
        const state = replay([...midStreamEvents, failureEvent]);
        expect(
          convertEveMessages(state, {
            isRunning: false,
            events: [failureEvent],
          }).at(-1)?.status,
        ).toEqual({
          type: "incomplete",
          reason: "error",
          error: { code: "internal", message: "boom" },
        });
      });

      it("a cancelled turn stays cancelled after Eve settles its message", () => {
        const cancelEvent = {
          type: "turn.settled",
          meta: eventMeta(8),
          data: { turnId: "turn_1", outcome: "cancelled" },
        } as const satisfies SessionStreamEvent;
        const state = replay([...midStreamEvents, cancelEvent]);
        expect(
          convertEveMessages(state, { isRunning: false }).at(-1)?.status,
        ).toEqual({
          type: "complete",
          reason: "stop",
        });
        expect(
          convertEveMessages(state, {
            isRunning: false,
            events: [cancelEvent],
          }).at(-1)?.status,
        ).toEqual({
          type: "incomplete",
          reason: "cancelled",
        });
      });

      it("a completed turn terminalizes the streaming marker and converts to complete", () => {
        const state = replay([
          ...midStreamEvents,
          completedContent("text", "part_1", "Let me think"),
          {
            type: "model.settled",
            data: {
              runId: "run_1",
              outcome: "completed",
              finishReason: "stop",
            },
          },
          {
            type: "turn.settled",
            data: { turnId: "turn_1", outcome: "completed", reply: ["part_1"] },
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
    } satisfies MessageData;

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

  it("preserves multiple text parts without attachments", () => {
    const message = {
      role: "user",
      createdAt: new Date(),
      parentId: null,
      sourceId: null,
      runConfig: undefined,
      metadata: { custom: {} },
      content: [
        { type: "text", text: "First" },
        { type: "text", text: "Second" },
      ],
    } satisfies AppendMessage;

    expect(getEveMessageContent(message)).toEqual([
      { type: "text", text: "First" },
      { type: "text", text: "Second" },
    ]);
  });

  it("rejects an unsupported append part instead of sending it to Eve", () => {
    const message = {
      ...baseAppendMessage,
      content: [{ type: "reasoning", text: "Private reasoning" }],
    } as AppendMessage;

    expect(() => getEveMessageContent(message)).toThrow(
      "Unsupported eve append message part type: reasoning",
    );
  });

  it("declares the data URL subtype of an image part", () => {
    const message = {
      ...baseAppendMessage,
      content: [{ type: "image", image: "data:image/jpeg;base64,/9j/4AAQ" }],
    } as AppendMessage;

    expect(getEveMessageContent(message)).toEqual([
      {
        type: "file",
        data: "data:image/jpeg;base64,/9j/4AAQ",
        mediaType: "image/jpeg",
      },
    ]);
  });

  it("sniffs an image part behind a generic envelope and rebuilds it", () => {
    const message = {
      ...baseAppendMessage,
      content: [
        {
          type: "image",
          image:
            "data:application/octet-stream;base64,iVBORw0KGgoAAAANSUhEUgAAAAE=",
        },
      ],
    } as AppendMessage;

    expect(getEveMessageContent(message)).toEqual([
      {
        type: "file",
        data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE=",
        mediaType: "image/png",
      },
    ]);
  });

  it("floors an http image part to image/png instead of a wildcard", () => {
    const message = {
      ...baseAppendMessage,
      content: [
        {
          type: "image",
          image: "https://example.com/photo",
          filename: "photo",
        },
      ],
    } as AppendMessage;

    expect(getEveMessageContent(message)).toEqual([
      {
        type: "file",
        data: "https://example.com/photo",
        mediaType: "image/png",
        filename: "photo",
      },
    ]);
  });

  it("declares an image attachment's content type for a url payload", () => {
    const message = {
      ...baseAppendMessage,
      content: [],
      attachments: [
        {
          id: "1",
          type: "image",
          name: "photo.jpg",
          contentType: "image/jpeg",
          content: [{ type: "image", image: "https://example.com/photo.jpg" }],
          status: { type: "complete" },
        },
      ],
    } as AppendMessage;

    expect(getEveMessageContent(message)).toEqual([
      {
        type: "file",
        data: "https://example.com/photo.jpg",
        mediaType: "image/jpeg",
      },
    ]);
  });

  it.each([
    {
      name: "an untyped URL",
      data: "https://example.com/file",
      mimeType: "",
      mediaType: "application/octet-stream",
      wireData: "https://example.com/file",
    },
    {
      name: "a data URL without an explicit type",
      data: "data:application/pdf;base64,JVBERi0=",
      mimeType: "",
      mediaType: "application/pdf",
      wireData: "data:application/pdf;base64,JVBERi0=",
    },
    {
      name: "a data URL with a conflicting envelope",
      data: "data:application/octet-stream;base64,JVBERi0=",
      mimeType: "application/pdf",
      mediaType: "application/pdf",
      wireData: "data:application/pdf;base64,JVBERi0=",
    },
  ])(
    "resolves file media types for $name",
    ({ data, mimeType, mediaType, wireData }) => {
      const message = {
        ...baseAppendMessage,
        content: [{ type: "file", data, mimeType, filename: "report.pdf" }],
      } satisfies AppendMessage;

      expect(getEveMessageContent(message)).toEqual([
        { type: "file", data: wireData, mediaType, filename: "report.pdf" },
      ]);
    },
  );

  it("uses a file attachment's content type when its part has none", () => {
    const message = {
      ...baseAppendMessage,
      content: [],
      attachments: [
        {
          id: "file-1",
          type: "file",
          name: "report.pdf",
          contentType: "application/pdf",
          content: [
            {
              type: "file",
              data: "https://example.com/report.pdf",
              mimeType: "",
            },
          ],
          status: { type: "complete" },
        },
      ],
    } satisfies AppendMessage;

    expect(getEveMessageContent(message)).toEqual([
      {
        type: "file",
        data: "https://example.com/report.pdf",
        mediaType: "application/pdf",
      },
    ]);
  });

  it("preserves opaque file references", () => {
    const message = {
      ...baseAppendMessage,
      content: [
        {
          type: "file",
          data: "file_abc123",
          mimeType: "application/pdf",
          sourceType: "id",
        },
      ],
    } satisfies AppendMessage;

    expect(getEveMessageContent(message)).toEqual([
      { type: "file", data: "file_abc123", mediaType: "application/pdf" },
    ]);
  });

  it("converts an audio part into a file part with the format-derived media type", () => {
    const message = {
      ...baseAppendMessage,
      content: [{ type: "audio", audio: { data: "QUJD", format: "mp3" } }],
    } as AppendMessage;

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
    } as AppendMessage;

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
    } as AppendMessage;

    expect(getEveMessageContent(message)).toEqual([
      {
        type: "file",
        data: "data:audio/mp3;base64,QUJD",
        mediaType: "audio/mp3",
      },
    ]);
  });

  it("rebuilds a media-less audio data URL from the typed format", () => {
    const message = {
      ...baseAppendMessage,
      content: [
        {
          type: "audio",
          audio: { data: "data:;base64,QUJD", format: "mp3" },
        },
      ],
    } as AppendMessage;

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
    } as AppendMessage;

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
    } as AppendMessage;

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
    } satisfies MessageData);

    expect(echoed?.content).toEqual([]);
    expect(echoed?.attachments?.map((a) => a.content)).toEqual([
      [
        {
          type: "file",
          data: "https://example.com/report.pdf",
          mimeType: "application/pdf",
          filename: "report.pdf",
          sourceType: "url",
        },
      ],
    ]);
  });

  it("skips data parts while keeping surrounding text", () => {
    const message = {
      ...baseAppendMessage,
      content: [
        { type: "text", text: "hi" },
        { type: "data", name: "chart", data: { x: 1 } },
      ],
    } as AppendMessage;

    expect(getEveMessageContent(message)).toBe("hi");
  });
});

const approveCancel = [
  { id: "approve", label: "Approve" },
  { id: "deny", label: "Cancel" },
];
const environments = [
  { id: "staging", label: "Staging" },
  { id: "production", label: "Production" },
];

const withInputRequest = (
  overrides: Partial<InputRequest> = {},
): InputRequest => ({
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
      interactionId: "req_1",
      optionId: "deny",
      text: "Not yet",
    });
  });

  it("keeps the shipped one-argument mapping when no request is available", () => {
    expect(toEveInputResponse({ approvalId: "req_1", approved: true })).toEqual(
      {
        interactionId: "req_1",
        optionId: "approve",
      },
    );

    expect(
      toEveInputResponse({
        approvalId: "req_1",
        approved: false,
        reason: "Not yet",
      }),
    ).toEqual({ interactionId: "req_1", optionId: "deny", text: "Not yet" });

    expect(
      toEveInputResponse({
        approvalId: "req_1",
        approved: true,
        optionId: "staging",
      }),
    ).toEqual({ interactionId: "req_1", optionId: "staging" });
  });

  it("keeps the confirmation mapping when the request carries approve/cancel options", () => {
    expect(
      toEveInputResponse(
        { approvalId: "req_1", approved: true },
        withInputRequest({ display: "confirmation", options: approveCancel }),
      ),
    ).toEqual({ interactionId: "req_1", optionId: "approve" });
  });

  it("maps a select response to the chosen option id", () => {
    expect(
      toEveInputResponse(
        { approvalId: "req_1", approved: true, optionId: "staging" },
        withInputRequest({ display: "select", options: environments }),
      ),
    ).toEqual({ interactionId: "req_1", optionId: "staging" });
  });

  it("preserves explanatory text with an explicitly selected option", () => {
    expect(
      toEveInputResponse(
        {
          approvalId: "req_1",
          approved: true,
          optionId: "staging",
          text: "Use the safe environment",
        },
        withInputRequest({ display: "select", options: environments }),
      ),
    ).toEqual({
      interactionId: "req_1",
      optionId: "staging",
      text: "Use the safe environment",
    });
  });

  it("explains that an optionless request cannot accept an explicit option", () => {
    expect(() =>
      toEveInputResponse(
        { approvalId: "req_1", approved: true, optionId: "staging" },
        withInputRequest({ display: "text" }),
      ),
    ).toThrow(
      'Eve interaction "req_1" has no option with id "staging"; respond with one of: (the request carries no options)',
    );
  });

  it.each([
    ["a text display", { display: "text", allowFreeform: true }],
    ["allowFreeform and no options", { allowFreeform: true }],
    ["neither a display nor allowFreeform", {}],
    [
      "a select display that allows freeform",
      { display: "select", allowFreeform: true, options: environments },
    ],
  ] satisfies [string, Partial<InputRequest>][])(
    "answers a request with %s as free-form text, not a fabricated option id",
    (_label, overrides) => {
      const response = toEveInputResponse(
        { approvalId: "req_1", approved: true, reason: "Quarterly results" },
        withInputRequest(overrides),
      );

      expect(response).toEqual({
        interactionId: "req_1",
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

  it("submits the response text as the free-form answer", () => {
    expect(
      toEveInputResponse(
        { approvalId: "req_1", approved: true, text: "staging" },
        withInputRequest({ display: "text" }),
      ),
    ).toEqual({ interactionId: "req_1", text: "staging" });
  });

  it("prefers the response text over the reason it used to be smuggled in", () => {
    expect(
      toEveInputResponse(
        {
          approvalId: "req_1",
          approved: true,
          text: "staging",
          reason: "picked the safe one",
        },
        withInputRequest({ display: "text" }),
      ),
    ).toEqual({ interactionId: "req_1", text: "staging" });
  });

  it("never fabricates approve for a text-display request without an answer", () => {
    expect(() =>
      toEveInputResponse(
        { approvalId: "req_1", approved: true },
        withInputRequest({ display: "text" }),
      ),
    ).toThrow(/pass the answer as the response text/);
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
    ).toEqual({ interactionId: "req_1", optionId: "approve" });

    expect(
      toEveInputResponse(
        { approvalId: "req_1", approved: true, reason: "Quarterly results" },
        inputRequest,
      ),
    ).toEqual({
      interactionId: "req_1",
      optionId: "approve",
      text: "Quarterly results",
    });
  });

  it("answers a tool-approval by kind even when its options are missing", () => {
    const inputRequest = withInputRequest({
      kind: "approval",
      display: "confirmation",
    });

    expect(
      toEveInputResponse({ approvalId: "req_1", approved: true }, inputRequest),
    ).toEqual({ interactionId: "req_1", optionId: "approve" });

    expect(
      toEveInputResponse(
        { approvalId: "req_1", approved: false, reason: "not now" },
        inputRequest,
      ),
    ).toEqual({ interactionId: "req_1", optionId: "deny", text: "not now" });
  });

  it("still requires a declared option when a tool-approval carries its own", () => {
    const inputRequest = withInputRequest({
      kind: "approval",
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
    ).toEqual({ interactionId: "req_1", optionId: "schedule-later" });
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
  const request = {
    kind: "question",
    prompt: "What should the subject line be?",
    display: "text",
    allowFreeform: true,
  } as const satisfies InputRequest;
  const data = {
    messages: [
      {
        id: "a1",
        role: "assistant",
        parts: [toolPart({ interaction: approvalInteraction(request) })],
      },
    ],
  } satisfies MessageData;

  it("finds the input request by approval id", () => {
    expect(findEveInputRequest(data, "req_1")).toMatchObject({
      prompt: "What should the subject line be?",
      display: "text",
    });
  });

  it("returns undefined for unknown approval ids", () => {
    expect(findEveInputRequest(data, "req_404")).toBeUndefined();
  });

  it("returns undefined when the matching tool has no interaction", () => {
    const bare = {
      messages: [{ id: "a1", role: "assistant", parts: [toolPart()] }],
    } satisfies MessageData;
    expect(findEveInputRequest(bare, "req_1")).toBeUndefined();
  });

  it("finds a standalone interaction by its approval id", () => {
    expect(
      findEveInputRequest(
        {
          messages: [
            { id: "a1", role: "assistant", parts: [signInPart(request)] },
          ],
        },
        "auth_1",
      ),
    ).toEqual(request);
  });
});

describe("collectInterruptedTurnEvents", () => {
  const started = (turnId: string, sequence: number) =>
    ({
      type: "turn.started",
      meta: eventMeta(sequence),
      data: {
        turnId,
        cause: { deliveryId: `delivery_${turnId}` },
        follows: null,
      },
    }) as const satisfies SessionStreamEvent;
  const failed = (turnId: string, sequence: number) =>
    ({
      type: "turn.settled",
      meta: eventMeta(sequence),
      data: {
        turnId,
        outcome: "failed",
        error: { code: "internal", message: "boom" },
      },
    }) as const satisfies SessionStreamEvent;
  const cancelled = (turnId: string, sequence: number) =>
    ({
      type: "turn.settled",
      meta: eventMeta(sequence),
      data: { turnId, outcome: "cancelled" },
    }) as const satisfies SessionStreamEvent;

  it("scans only appended events and keeps the array until an interruption arrives", () => {
    const cache: InterruptedTurnEventCache = {
      lastEvents: [],
      interruptions: [],
    };
    const first = [started("t1", 0), failed("t1", 1)];
    const interruptions = collectInterruptedTurnEvents(first, cache);
    expect(interruptions).toEqual([first[1]]);
    const quiet = [...cache.lastEvents, started("t2", 2)];
    expect(collectInterruptedTurnEvents(quiet, cache)).toBe(interruptions);
    const appended = [...cache.lastEvents, cancelled("t2", 3)];
    const next = collectInterruptedTurnEvents(appended, cache);
    expect(next).toEqual([first[1], appended[3]]);
    expect(next[0]).toBe(interruptions[0]);
  });

  it("rescans a log that does not extend the scanned one", () => {
    const cache: InterruptedTurnEventCache = {
      lastEvents: [],
      interruptions: [],
    };
    collectInterruptedTurnEvents([started("t1", 0), failed("t1", 1)], cache);
    expect(collectInterruptedTurnEvents([started("t2", 0)], cache)).toEqual([]);
  });

  it("records failed session endings and ignores completed endings", () => {
    const cache: InterruptedTurnEventCache = {
      lastEvents: [],
      interruptions: [],
    };
    const completed = {
      type: "session.ended",
      data: { outcome: "completed" },
      meta: eventMeta(1),
    } as const satisfies SessionStreamEvent;
    const failedSession = {
      type: "session.ended",
      data: { outcome: "failed", cause: { turnId: "t1" } },
      meta: eventMeta(2),
    } as const satisfies SessionStreamEvent;
    const events = [completed, failedSession];

    expect(collectInterruptedTurnEvents(events, cache)).toEqual([
      failedSession,
    ]);
    expect(collectInterruptedTurnEvents(events, cache)).toBe(
      cache.interruptions,
    );
  });
});

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  RespondToToolApprovalOptions,
  ThreadMessage,
  ToolCallMessagePart,
} from "@assistant-ui/core";
import type { AdkMessage } from "./types";

const mocks = vi.hoisted(() => ({
  adapters: [] as unknown[],
  sendMessage: vi.fn().mockResolvedValue(undefined),
  messages: [] as AdkMessage[],
}));

vi.mock("@assistant-ui/core/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/core/react")>()),
  useCloudThreadListAdapter: () => ({}),
  useExternalStoreRuntime: (adapter: unknown) => {
    mocks.adapters.push(adapter);
    return {};
  },
  useRemoteThreadListRuntime: (options: { runtimeHook: () => unknown }) =>
    options.runtimeHook(),
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => ({
    threadListItem: {
      source: null,
      getState: () => ({ externalId: undefined }),
      initialize: vi.fn(),
    },
  }),
}));

vi.mock("./useAdkMessages", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./useAdkMessages")>()),
  useAdkMessages: () => ({
    messages: mocks.messages,
    stateDelta: {},
    agentInfo: {},
    longRunningToolIds: [],
    artifactDelta: {},
    // Deliberately empty: the projection must come from the transcript, not
    // from derived confirmation state that a mid-run accumulator swap drops.
    toolConfirmations: [],
    authRequests: [],
    escalated: false,
    messageMetadata: new Map(),
    sendMessage: mocks.sendMessage,
    cancel: vi.fn(),
    setMessages: vi.fn(),
    replaceMessages: vi.fn(),
    applySnapshot: vi.fn(),
  }),
}));

import { AdkEventAccumulator } from "./AdkEventAccumulator";
import { useAdkRuntime } from "./useAdkRuntime";

type ApprovalAdapter = {
  messages: readonly ThreadMessage[];
  onRespondToToolApproval?: (
    options: RespondToToolApprovalOptions,
  ) => Promise<void> | void;
};

const CONFIRMATION_CALL = "adk-confirmation-1";

const latestAdapter = () => mocks.adapters.at(-1) as ApprovalAdapter;

const makeConfirmationRequest = (): AdkMessage => ({
  id: "ai-1",
  type: "ai",
  content: [],
  tool_calls: [
    {
      id: CONFIRMATION_CALL,
      name: "adk_request_confirmation",
      args: {
        originalFunctionCall: { id: "adk-original-1", name: "delete_file" },
        toolConfirmation: { hint: "Delete /tmp/a?" },
      },
    },
  ],
});

const approvalPart = () =>
  latestAdapter()
    .messages.at(-1)!
    .content.find(
      (part) => part.type === "tool-call" && part.approval !== undefined,
    );

afterEach(() => {
  mocks.adapters.length = 0;
  mocks.messages = [];
  vi.clearAllMocks();
});

describe("useAdkRuntime tool approvals", () => {
  it("exposes, answers, and settles the default approval seam across a rerender", async () => {
    // Retained across the rerender: core caches converted messages by input
    // object, so only a rebuilt converter can surface the settled decision.
    const confirmationRequest = makeConfirmationRequest();
    mocks.messages = [
      { id: "u-1", type: "human", content: "delete the file" },
      confirmationRequest,
    ];

    const { rerender } = renderHook(() => useAdkRuntime({ stream: vi.fn() }));

    expect(latestAdapter().messages.at(-1)!.status).toMatchObject({
      type: "requires-action",
      reason: "interrupt",
    });
    expect(approvalPart()).toMatchObject({
      toolCallId: CONFIRMATION_CALL,
      approval: { id: CONFIRMATION_CALL },
    });

    await act(async () => {
      await latestAdapter().onRespondToToolApproval!({
        approvalId: CONFIRMATION_CALL,
        approved: false,
      });
    });

    expect(mocks.sendMessage.mock.calls.at(-1)![0]).toEqual([
      expect.objectContaining({
        type: "tool",
        tool_call_id: CONFIRMATION_CALL,
        name: "adk_request_confirmation",
        content: JSON.stringify({ confirmed: false }),
      }),
    ]);

    mocks.messages = [
      ...mocks.messages,
      {
        id: "tool-1",
        type: "tool",
        tool_call_id: CONFIRMATION_CALL,
        name: "adk_request_confirmation",
        content: JSON.stringify({ confirmed: false }),
        status: "success",
      },
    ];
    rerender();

    expect(approvalPart()).toMatchObject({
      approval: { id: CONFIRMATION_CALL, approved: false },
    });
    expect(latestAdapter().messages.at(-1)!.status).not.toMatchObject({
      type: "requires-action",
    });

    await expect(
      latestAdapter().onRespondToToolApproval!({
        approvalId: CONFIRMATION_CALL,
        approved: true,
      }),
    ).rejects.toThrow("No pending ADK tool confirmation");
  });

  it("keeps a gate answered by an unreadable reply retryable at the runtime seam", async () => {
    mocks.messages = [
      { id: "u-1", type: "human", content: "delete the file" },
      makeConfirmationRequest(),
      {
        id: "tool-1",
        type: "tool",
        tool_call_id: CONFIRMATION_CALL,
        name: "adk_request_confirmation",
        // ADK parses the wrapped text without a `try`, so this reply raises
        // rather than denying, and the gate stays answerable.
        content: JSON.stringify({ response: "not-json" }),
        status: "success",
      },
    ];

    renderHook(() => useAdkRuntime({ stream: vi.fn() }));

    expect(latestAdapter().messages.at(-1)!.status).toMatchObject({
      type: "requires-action",
      reason: "interrupt",
    });
    const part = approvalPart() as { result?: unknown; approval: unknown };
    expect(part.result).toBeUndefined();
    expect(part.approval).toEqual({ id: CONFIRMATION_CALL });

    await act(async () => {
      await latestAdapter().onRespondToToolApproval!({
        approvalId: CONFIRMATION_CALL,
        approved: true,
      });
    });

    expect(mocks.sendMessage.mock.calls.at(-1)![0]).toEqual([
      expect.objectContaining({
        tool_call_id: CONFIRMATION_CALL,
        content: JSON.stringify({ confirmed: true }),
      }),
    ]);
  });

  it("keeps both gates of an event retryable when one reply is unreadable", () => {
    const accumulator = new AdkEventAccumulator();
    const confirmationCall = (id: string, tool: string) => ({
      functionCall: {
        id,
        name: "adk_request_confirmation",
        args: {
          originalFunctionCall: { id: `original-${id}`, name: tool },
          toolConfirmation: { hint: `Run ${tool}?` },
        },
      },
    });
    accumulator.processEvent({
      id: "evt-request",
      author: "agent",
      longRunningToolIds: ["conf-a", "conf-b"],
      content: {
        role: "model",
        parts: [
          confirmationCall("conf-a", "delete_file"),
          confirmationCall("conf-b", "send_email"),
        ],
      },
    });
    mocks.messages = accumulator.processEvent({
      id: "evt-reply",
      author: "user",
      content: {
        role: "user",
        parts: [
          {
            functionResponse: {
              id: "conf-a",
              name: "adk_request_confirmation",
              response: { confirmed: true },
            },
          },
          {
            functionResponse: {
              id: "conf-b",
              name: "adk_request_confirmation",
              response: { response: "not json" },
            },
          },
        ],
      },
    });

    renderHook(() => useAdkRuntime({ stream: vi.fn() }));

    const assistant = latestAdapter().messages.find(
      (message): message is Extract<ThreadMessage, { role: "assistant" }> =>
        message.role === "assistant",
    )!;
    const gates = assistant.content.filter(
      (part): part is ToolCallMessagePart =>
        part.type === "tool-call" && part.approval !== undefined,
    );

    expect(gates.map((gate) => gate.approval)).toEqual([
      { id: "conf-a" },
      { id: "conf-b" },
    ]);
    expect(gates.map((gate) => gate.result)).toEqual([undefined, undefined]);
    expect(assistant.status).toMatchObject({
      type: "requires-action",
      reason: "interrupt",
    });
  });

  it("settles a confirmation reply carried beside user text without an orphan message", () => {
    const accumulator = new AdkEventAccumulator();
    accumulator.processEvent({
      id: "evt-request",
      author: "agent",
      longRunningToolIds: [CONFIRMATION_CALL],
      content: {
        role: "model",
        parts: [
          {
            functionCall: {
              id: CONFIRMATION_CALL,
              name: "adk_request_confirmation",
              args: {
                originalFunctionCall: {
                  id: "adk-original-1",
                  name: "delete_file",
                },
                toolConfirmation: { hint: "Delete /tmp/a?" },
              },
            },
          },
        ],
      },
    });
    mocks.messages = accumulator.processEvent({
      id: "evt-reply",
      author: "user",
      content: {
        role: "user",
        parts: [
          { text: "go ahead" },
          {
            functionResponse: {
              id: CONFIRMATION_CALL,
              name: "adk_request_confirmation",
              response: { confirmed: true },
            },
          },
        ],
      },
    });

    renderHook(() => useAdkRuntime({ stream: vi.fn() }));

    const messages = latestAdapter().messages;
    const assistant = messages.find(
      (message): message is Extract<ThreadMessage, { role: "assistant" }> =>
        message.role === "assistant",
    );
    const gate = assistant?.content.find(
      (part) => part.type === "tool-call" && part.approval !== undefined,
    ) as ToolCallMessagePart | undefined;
    expect(gate?.approval).toEqual({
      id: CONFIRMATION_CALL,
      approved: true,
    });
    expect(
      messages.some(
        (message) =>
          message.role === "assistant" && message.content.length === 0,
      ),
    ).toBe(false);
    expect(messages.at(-1)!.role).toBe("user");
  });
});

import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  RespondToToolApprovalOptions,
  ThreadMessage,
  ToolCallMessagePart,
} from "@assistant-ui/core";
import type { AdkMessage, AdkToolConfirmation } from "./types";

const mocks = vi.hoisted(() => ({
  adapters: [] as unknown[],
  sendMessage: vi.fn().mockResolvedValue(undefined),
  messages: [] as AdkMessage[],
  toolConfirmations: [] as AdkToolConfirmation[],
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
    toolConfirmations: mocks.toolConfirmations,
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

import { useAdkRuntime } from "./useAdkRuntime";

type ApprovalAdapter = {
  messages: readonly ThreadMessage[];
  onRespondToToolApproval?: (
    options: RespondToToolApprovalOptions,
  ) => Promise<void> | void;
};

const CONFIRMATION_CALL_ID = "tc-1";

const pendingConfirmationThread = () => {
  mocks.messages = [
    { id: "u-1", type: "human", content: "delete the file" },
    {
      id: "ai-1",
      type: "ai",
      content: [],
      tool_calls: [
        {
          id: CONFIRMATION_CALL_ID,
          name: "adk_request_confirmation",
          args: { hint: "Delete /tmp/a?" },
          argsText: '{"hint":"Delete /tmp/a?"}',
        },
      ],
    },
  ];
  mocks.toolConfirmations = [
    {
      toolCallId: CONFIRMATION_CALL_ID,
      toolName: "delete_file",
      args: { path: "/tmp/a" },
      hint: "Delete /tmp/a?",
      confirmed: false,
    },
  ];
};

const mountRuntime = () => {
  renderHook(() => useAdkRuntime({ stream: vi.fn() }));
  return mocks.adapters.at(-1) as ApprovalAdapter;
};

afterEach(() => {
  mocks.adapters.length = 0;
  mocks.messages = [];
  mocks.toolConfirmations = [];
  vi.clearAllMocks();
});

describe("useAdkRuntime tool approvals", () => {
  it("surfaces a pending confirmation as an approval gate awaiting action", async () => {
    pendingConfirmationThread();
    const adapter = mountRuntime();

    const assistantMessage = adapter.messages.at(-1)!;
    expect(assistantMessage.role).toBe("assistant");
    expect(assistantMessage.status).toMatchObject({
      type: "requires-action",
      reason: "interrupt",
    });
    expect(assistantMessage.content).toContainEqual(
      expect.objectContaining({
        type: "tool-call",
        toolCallId: CONFIRMATION_CALL_ID,
        approval: { id: CONFIRMATION_CALL_ID },
      }),
    );
  });

  it("leaves an ungated tool call without an approval", () => {
    mocks.messages = [
      {
        id: "ai-1",
        type: "ai",
        content: [],
        tool_calls: [{ id: "tc-9", name: "search", args: {}, argsText: "{}" }],
      },
    ];
    const adapter = mountRuntime();

    const part = adapter.messages.at(-1)!.content[0] as ToolCallMessagePart;
    expect(part.type).toBe("tool-call");
    expect(part.approval).toBeUndefined();
    expect(adapter.messages.at(-1)!.status).toMatchObject({
      type: "requires-action",
      reason: "tool-calls",
    });
  });

  it("settles the gate once the confirmation is answered", async () => {
    pendingConfirmationThread();
    mocks.messages = [
      ...mocks.messages,
      {
        id: "tool-1",
        type: "tool",
        tool_call_id: CONFIRMATION_CALL_ID,
        name: "adk_request_confirmation",
        content: JSON.stringify({ confirmed: true }),
        status: "success",
      },
    ];
    const adapter = mountRuntime();

    expect(adapter.messages.at(-1)!.content).toContainEqual(
      expect.objectContaining({
        type: "tool-call",
        approval: { id: CONFIRMATION_CALL_ID, approved: true },
      }),
    );
  });

  it("sends an approval through the ADK confirmation reply", async () => {
    pendingConfirmationThread();
    const adapter = mountRuntime();

    await adapter.onRespondToToolApproval!({
      approvalId: CONFIRMATION_CALL_ID,
      approved: true,
    });

    const [sent] = mocks.sendMessage.mock.calls.at(-1)!;
    expect(sent).toEqual([
      expect.objectContaining({
        type: "tool",
        tool_call_id: CONFIRMATION_CALL_ID,
        name: "adk_request_confirmation",
        content: JSON.stringify({ confirmed: true }),
        status: "success",
      }),
    ]);
  });

  it("sends a denial through the ADK confirmation reply", async () => {
    pendingConfirmationThread();
    const adapter = mountRuntime();

    await adapter.onRespondToToolApproval!({
      approvalId: CONFIRMATION_CALL_ID,
      approved: false,
    });

    const [sent] = mocks.sendMessage.mock.calls.at(-1)!;
    expect(sent[0].content).toBe(JSON.stringify({ confirmed: false }));
  });

  it("refuses an approval id with no pending confirmation", async () => {
    pendingConfirmationThread();
    const adapter = mountRuntime();

    await expect(
      adapter.onRespondToToolApproval!({
        approvalId: "stale-id",
        approved: true,
      }),
    ).rejects.toThrow("No pending ADK tool confirmation");
    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });
});

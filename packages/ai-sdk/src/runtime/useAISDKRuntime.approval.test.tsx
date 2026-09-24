// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import {
  bindExternalStoreMessage,
  type ExternalStoreAdapter,
  type ThreadAssistantMessage,
  type ThreadMessage,
} from "@assistant-ui/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  adapter: undefined as ExternalStoreAdapter | undefined,
  persistToolApprovalResponses: vi.fn(),
  threadMessages: [] as ThreadMessage[],
}));

vi.mock("@assistant-ui/core/react", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@assistant-ui/core/react")>();
  return {
    ...original,
    useExternalStoreRuntime: vi.fn((adapter: ExternalStoreAdapter) => {
      mocks.adapter = adapter;
      return {
        thread: {
          getState: () => ({ messages: mocks.threadMessages }),
        },
      } as never;
    }),
    useRuntimeAdapters: vi.fn(() => ({})),
  };
});

vi.mock("./useExternalHistory", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./useExternalHistory")>();
  return {
    ...original,
    useExternalHistory: vi.fn(() => ({
      isLoading: false,
      deleteMessage: vi.fn().mockResolvedValue(undefined),
      persistToolInteractions: vi.fn().mockResolvedValue(undefined),
      persistToolApprovalResponses: mocks.persistToolApprovalResponses,
    })),
  };
});

import { useAISDKRuntime } from "./useAISDKRuntime";
import { useExternalHistory } from "./useExternalHistory";

describe("useAISDKRuntime tool approvals", () => {
  beforeEach(() => {
    mocks.adapter = undefined;
    mocks.threadMessages = [];
    mocks.persistToolApprovalResponses.mockReset().mockResolvedValue(undefined);
    vi.mocked(useExternalHistory)
      .mockReset()
      .mockImplementation(() => ({
        isLoading: false,
        deleteMessage: vi.fn().mockResolvedValue(undefined),
        persistToolInteractions: vi.fn().mockResolvedValue(undefined),
        persistToolApprovalResponses: mocks.persistToolApprovalResponses,
      }));
  });

  it("forwards the AI SDK approval promise to the external-store adapter", () => {
    const approvalPromise = Promise.resolve();
    const addToolApprovalResponse = vi.fn(() => approvalPromise);
    const chat = {
      id: "chat-1",
      status: "ready",
      error: undefined,
      messages: [],
      setMessages: vi.fn(),
      sendMessage: vi.fn(),
      regenerate: vi.fn(),
      addToolOutput: vi.fn(),
      addToolApprovalResponse,
      stop: vi.fn(),
    };

    renderHook(() => useAISDKRuntime(chat as never));

    const result = mocks.adapter?.onRespondToToolApproval?.({
      approvalId: "approval-1",
      approved: true,
    });

    expect(result).toBe(approvalPromise);
    expect(addToolApprovalResponse).toHaveBeenCalledWith({
      id: "approval-1",
      approved: true,
      options: { metadata: undefined },
    });
  });

  const setupPendingApproval = (
    onRespondToToolApproval: NonNullable<
      Parameters<typeof useAISDKRuntime>[1]
    >["onRespondToToolApproval"],
    precedingMessages: unknown[] = [],
  ) => {
    const messages = [
      ...precedingMessages,
      {
        id: "message-1",
        role: "assistant",
        parts: [
          {
            type: "tool-deploy",
            toolCallId: "tool-1",
            state: "approval-requested",
            input: {},
            approval: { id: "approval-1" },
          },
        ],
      },
    ];
    const setMessages = vi.fn();
    const sendMessage = vi.fn();
    const addToolApprovalResponse = vi.fn();
    const chat = {
      id: "chat-1",
      status: "ready",
      error: undefined,
      messages,
      setMessages,
      sendMessage,
      regenerate: vi.fn(),
      addToolOutput: vi.fn(),
      addToolApprovalResponse,
      stop: vi.fn(),
    };

    renderHook(() =>
      useAISDKRuntime(chat as never, { onRespondToToolApproval }),
    );

    return {
      respond: (response: {
        approvalId: string;
        approved: boolean;
        optionId?: string;
        text?: string;
        reason?: string;
      }) => mocks.adapter?.onRespondToToolApproval?.(response),
      setMessages,
      addToolApprovalResponse,
      sendMessage,
      messages,
      getApproval: () =>
        mocks.adapter?.messages?.[0]?.content.find(
          (part) => part.type === "tool-call",
        )?.approval,
      getToolCall: () =>
        mocks.adapter?.messages?.[0]?.content.find(
          (part) => part.type === "tool-call",
        ),
    };
  };

  it("skips earlier approval-requested tool parts without approval metadata", async () => {
    const onRespondToToolApproval = vi.fn(async () => {});
    const { respond } = setupPendingApproval(onRespondToToolApproval, [
      {
        id: "message-0",
        role: "assistant",
        parts: [
          {
            type: "tool-legacy",
            toolCallId: "tool-0",
            state: "approval-requested",
            input: {},
          },
        ],
      },
    ]);
    const response = { approvalId: "approval-1", approved: true };

    await act(async () => {
      await respond(response);
    });

    expect(onRespondToToolApproval).toHaveBeenCalledExactlyOnceWith(response, {
      toolCallId: "tool-1",
      toolName: "deploy",
      respondViaAISDK: expect.any(Function),
    });
  });

  it("stores a host answer after the handler resolves without starting a run", async () => {
    const onRespondToToolApproval = vi.fn(async () => {});
    const {
      respond,
      setMessages,
      addToolApprovalResponse,
      sendMessage,
      messages,
      getApproval,
    } = setupPendingApproval(onRespondToToolApproval);

    const response = {
      approvalId: "approval-1",
      approved: true,
      optionId: "allow-session",
      text: "Only for this environment",
      reason: "Approved by operator",
    };
    await act(async () => {
      await respond(response);
    });

    expect(onRespondToToolApproval).toHaveBeenCalledWith(response, {
      toolCallId: "tool-1",
      toolName: "deploy",
      respondViaAISDK: expect.any(Function),
    });
    expect(addToolApprovalResponse).not.toHaveBeenCalled();
    expect(setMessages).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
    expect(mocks.persistToolApprovalResponses).toHaveBeenCalledExactlyOnceWith(
      "message-1",
    );
    expect(messages[0]).not.toHaveProperty(
      "metadata.__aui_toolApprovalResponses",
    );
    expect(getApproval()).toEqual({
      id: "approval-1",
      approved: true,
      reason: "Approved by operator",
      optionId: "allow-session",
      text: "Only for this environment",
    });
  });

  it("does not store a request the handler hands back through the AI SDK", async () => {
    const { respond, addToolApprovalResponse } = setupPendingApproval(
      (_response, { respondViaAISDK }) => respondViaAISDK(),
    );

    await act(async () => {
      await respond({
        approvalId: "approval-1",
        approved: false,
        optionId: "reject-once",
        reason: "Not now",
      });
    });

    expect(addToolApprovalResponse).toHaveBeenCalledWith({
      id: "approval-1",
      approved: false,
      reason: "Not now",
      options: { metadata: undefined },
    });
    expect(mocks.persistToolApprovalResponses).not.toHaveBeenCalled();
  });

  it("does not store a host answer when the handler rejects", async () => {
    const { respond, messages, getApproval } = setupPendingApproval(
      async () => {
        throw new Error("resume failed");
      },
    );

    await expect(
      act(async () => {
        await respond({ approvalId: "approval-1", approved: true });
      }),
    ).rejects.toThrow("resume failed");

    expect(mocks.persistToolApprovalResponses).not.toHaveBeenCalled();
    expect(getApproval()).toEqual({ id: "approval-1" });
    expect(messages[0]).not.toHaveProperty(
      "metadata.__aui_toolApprovalResponses",
    );
  });

  it("reopens a request when a handed-back AI SDK response fails inside the handler", async () => {
    const { respond, addToolApprovalResponse, getApproval } =
      setupPendingApproval(async (_response, { respondViaAISDK }) => {
        await respondViaAISDK().catch(() => {});
      });
    addToolApprovalResponse.mockRejectedValueOnce(new Error("offline"));

    await act(async () => {
      await respond({ approvalId: "approval-1", approved: true });
    });

    expect(getApproval()).toEqual({ id: "approval-1" });
    await act(async () => {
      await respond({ approvalId: "approval-1", approved: true });
    });
    expect(addToolApprovalResponse).toHaveBeenCalledTimes(2);
  });

  it("keeps a host answer when the runtime switches chats and back", async () => {
    const chatWith = (id: string, approvalId: string) => ({
      id,
      status: "ready",
      error: undefined,
      messages: [
        {
          id: `message-${id}`,
          role: "assistant",
          parts: [
            {
              type: "tool-deploy",
              toolCallId: `tool-${id}`,
              state: "approval-requested",
              input: {},
              approval: { id: approvalId },
            },
          ],
        },
      ],
      setMessages: vi.fn(),
      sendMessage: vi.fn(),
      regenerate: vi.fn(),
      addToolOutput: vi.fn(),
      addToolApprovalResponse: vi.fn(),
      stop: vi.fn(),
    });
    const chatA = chatWith("chat-a", "approval-a");
    const chatB = chatWith("chat-b", "approval-b");
    const onRespondToToolApproval = vi.fn(async () => {});
    const { rerender } = renderHook(
      ({ chat }: { chat: typeof chatA }) =>
        useAISDKRuntime(chat as never, { onRespondToToolApproval }),
      { initialProps: { chat: chatA } },
    );
    const respond = (approvalId: string) =>
      act(async () => {
        await mocks.adapter?.onRespondToToolApproval?.({
          approvalId,
          approved: true,
        });
      });
    const getApproval = () =>
      mocks.adapter?.messages?.[0]?.content.find(
        (part) => part.type === "tool-call",
      )?.approval;

    await respond("approval-a");
    rerender({ chat: chatB });
    await respond("approval-b");
    rerender({ chat: chatA });

    expect(getApproval()).toEqual({ id: "approval-a", approved: true });
    await expect(respond("approval-a")).rejects.toThrow(
      "Tool approval approval-a is not waiting for a response.",
    );
    expect(onRespondToToolApproval).toHaveBeenCalledTimes(2);
  });

  it("restores a host answer and refuses a second response", async () => {
    const onRespondToToolApproval = vi.fn(async () => {});
    const { respond, getApproval, messages } = setupPendingApproval(
      onRespondToToolApproval,
    );
    const historyCall = vi.mocked(useExternalHistory).mock.calls.at(-1)!;
    const toolApprovalResponses = historyCall[9] as Map<
      string,
      { approvalId: string; approved: boolean; reason?: string }
    >;
    const onToolApprovalResponsesRestored = historyCall[10] as () => void;

    await act(async () => {
      toolApprovalResponses.set("approval-1", {
        approvalId: "approval-1",
        approved: true,
        reason: "Approved by operator",
      });
      onToolApprovalResponsesRestored();
    });

    await waitFor(() =>
      expect(getApproval()).toEqual({
        id: "approval-1",
        approved: true,
        reason: "Approved by operator",
      }),
    );
    await expect(
      respond({ approvalId: "approval-1", approved: true }),
    ).rejects.toThrow(
      "Tool approval approval-1 is not waiting for a response.",
    );
    expect(onRespondToToolApproval).not.toHaveBeenCalled();
    expect(messages[0]).not.toHaveProperty(
      "metadata.__aui_toolApprovalResponses",
    );
  });

  it("reopens a restored approval when history clears its response map", async () => {
    const onRespondToToolApproval = vi.fn(async () => {});
    const { respond, getApproval } = setupPendingApproval(
      onRespondToToolApproval,
    );
    const historyCall = vi.mocked(useExternalHistory).mock.calls.at(-1)!;
    const toolApprovalResponses = historyCall[9] as Map<
      string,
      { approvalId: string; approved: boolean }
    >;
    const onToolApprovalResponsesRestored = historyCall[10] as () => void;

    await act(async () => {
      toolApprovalResponses.set("approval-1", {
        approvalId: "approval-1",
        approved: true,
      });
      onToolApprovalResponsesRestored();
    });
    await waitFor(() =>
      expect(getApproval()).toEqual({ id: "approval-1", approved: true }),
    );

    await act(async () => {
      toolApprovalResponses.clear();
      onToolApprovalResponsesRestored();
    });
    await waitFor(() => expect(getApproval()).toEqual({ id: "approval-1" }));

    await act(async () => {
      await respond({ approvalId: "approval-1", approved: true });
    });
    expect(onRespondToToolApproval).toHaveBeenCalledOnce();
  });

  it("clears deleted tool sidecars and its host approval reservation", async () => {
    const onRespondToToolApproval = vi.fn(async () => {});
    const { getApproval, getToolCall, messages, respond } =
      setupPendingApproval(onRespondToToolApproval);
    const threadMessage: ThreadAssistantMessage = {
      id: "message-1",
      role: "assistant",
      content: [
        {
          type: "tool-call",
          toolCallId: "tool-1",
          toolName: "deploy",
          args: {},
          argsText: "{}",
          result: undefined,
          isError: false,
          approval: { id: "approval-1" },
        },
      ],
      createdAt: new Date(),
      status: { type: "requires-action", reason: "tool-calls" },
      metadata: {
        unstable_state: null,
        unstable_annotations: [],
        unstable_data: [],
        steps: [],
        custom: {},
      },
    };
    bindExternalStoreMessage(threadMessage, messages[0]!);
    mocks.threadMessages = [threadMessage];

    await act(async () => {
      await respond({ approvalId: "approval-1", approved: true });
      await mocks.adapter?.onAddToolResult?.({
        messageId: "message-1",
        toolCallId: "tool-1",
        toolName: "deploy",
        result: "deployed",
        artifact: { preview: "deployment complete" },
        isError: false,
      });
      await mocks.adapter?.unstable_onRecordToolInteraction?.({
        messageId: "message-1",
        toolCallId: "tool-1",
        interaction: {
          type: "action",
          occurredAt: 1,
          payload: { copied: true },
        },
      });
    });
    expect(getToolCall()).toMatchObject({
      artifact: { preview: "deployment complete" },
      unstable_interactions: {
        entries: [{ type: "action", occurredAt: 1, payload: { copied: true } }],
      },
      approval: { id: "approval-1", approved: true },
    });

    await act(async () => {
      await mocks.adapter?.onDelete?.("message-1");
    });
    expect(getToolCall()).not.toHaveProperty("artifact");
    expect(getToolCall()).not.toHaveProperty("unstable_interactions");
    expect(getApproval()).toEqual({ id: "approval-1" });

    await act(async () => {
      await respond({ approvalId: "approval-1", approved: true });
    });
    expect(onRespondToToolApproval).toHaveBeenCalledTimes(2);
  });

  it("rejects an approval that is not waiting for a response", async () => {
    const onRespondToToolApproval = vi.fn();
    const { respond } = setupPendingApproval(onRespondToToolApproval);

    await expect(
      respond({ approvalId: "approval-2", approved: true }),
    ).rejects.toThrow(
      "Tool approval approval-2 is not waiting for a response.",
    );
    expect(onRespondToToolApproval).not.toHaveBeenCalled();
  });

  it("updates the rendered approval shape with the response channel", () => {
    const onRespondToToolApproval = vi.fn();
    const chat = {
      id: "chat-1",
      status: "ready",
      error: undefined,
      messages: [
        {
          id: "message-1",
          role: "assistant",
          parts: [
            {
              type: "tool-deploy",
              toolCallId: "tool-1",
              state: "approval-requested",
              input: {},
              approval: {
                id: "approval-1",
                display: "select",
                options: [{ id: "allow-session", kind: "allow-once" }],
              },
            },
          ],
        },
      ],
      setMessages: vi.fn(),
      sendMessage: vi.fn(),
      regenerate: vi.fn(),
      addToolOutput: vi.fn(),
      addToolApprovalResponse: vi.fn(),
      stop: vi.fn(),
    };

    const { rerender } = renderHook(
      ({ useCustomHandler }: { useCustomHandler: boolean }) =>
        useAISDKRuntime(chat as never, {
          ...(useCustomHandler && { onRespondToToolApproval }),
        }),
      { initialProps: { useCustomHandler: false } },
    );

    const getApproval = () =>
      mocks.adapter?.messages?.[0]?.content.find(
        (part) => part.type === "tool-call",
      )?.approval;

    expect(getApproval()).toEqual({ id: "approval-1" });

    rerender({ useCustomHandler: true });

    expect(getApproval()).toEqual({
      id: "approval-1",
      display: "select",
      options: [{ id: "allow-session", kind: "allow-once" }],
    });
  });
});

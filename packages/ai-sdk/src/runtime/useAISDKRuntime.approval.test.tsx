// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import type { ExternalStoreAdapter } from "@assistant-ui/core";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  adapter: undefined as ExternalStoreAdapter | undefined,
}));

vi.mock("@assistant-ui/core/react", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@assistant-ui/core/react")>();
  return {
    ...original,
    useExternalStoreRuntime: vi.fn((adapter: ExternalStoreAdapter) => {
      mocks.adapter = adapter;
      return {};
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
    })),
  };
});

import { useAISDKRuntime } from "./useAISDKRuntime";

describe("useAISDKRuntime tool approvals", () => {
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
  ) => {
    const messages = [
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
    const addToolApprovalResponse = vi.fn();
    const chat = {
      id: "chat-1",
      status: "ready",
      error: undefined,
      messages,
      setMessages,
      sendMessage: vi.fn(),
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
      getApproval: () =>
        mocks.adapter?.messages?.[0]?.content.find(
          (part) => part.type === "tool-call",
        )?.approval,
    };
  };

  it("hands the complete response to a custom handler and applies the answer", async () => {
    const onRespondToToolApproval = vi.fn(async () => {});
    const { respond, setMessages, addToolApprovalResponse, getApproval } =
      setupPendingApproval(onRespondToToolApproval);

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
    expect(getApproval()).toEqual({
      id: "approval-1",
      approved: true,
      reason: "Approved by operator",
      optionId: "allow-session",
      text: "Only for this environment",
    });
  });

  it("sends a request the handler hands back through the AI SDK", async () => {
    const { respond, addToolApprovalResponse } = setupPendingApproval(
      (_response, { respondViaAISDK }) => respondViaAISDK(),
    );

    await respond({
      approvalId: "approval-1",
      approved: false,
      optionId: "reject-once",
      reason: "Not now",
    });

    expect(addToolApprovalResponse).toHaveBeenCalledWith({
      id: "approval-1",
      approved: false,
      reason: "Not now",
      options: { metadata: undefined },
    });
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

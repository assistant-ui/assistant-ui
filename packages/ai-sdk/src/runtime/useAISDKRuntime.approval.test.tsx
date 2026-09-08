// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
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

  it("prefers a custom approval handler and forwards the complete response", () => {
    const approvalPromise = Promise.resolve();
    const onRespondToToolApproval = vi.fn(() => approvalPromise);
    const addToolApprovalResponse = vi.fn();
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

    renderHook(() =>
      useAISDKRuntime(chat as never, { onRespondToToolApproval }),
    );

    const response = {
      approvalId: "approval-1",
      approved: true,
      optionId: "allow-session",
      text: "Only for this environment",
      reason: "Approved by operator",
    };
    const result = mocks.adapter?.onRespondToToolApproval?.(response);

    expect(result).toBe(approvalPromise);
    expect(onRespondToToolApproval).toHaveBeenCalledWith(response);
    expect(addToolApprovalResponse).not.toHaveBeenCalled();
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

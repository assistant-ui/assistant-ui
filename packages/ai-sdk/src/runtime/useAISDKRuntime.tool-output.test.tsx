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

const createChatHelpers = (addToolOutput: ReturnType<typeof vi.fn>) => ({
  id: "chat-1",
  status: "ready",
  error: undefined,
  messages: [],
  setMessages: vi.fn(),
  sendMessage: vi.fn(),
  regenerate: vi.fn(),
  addToolOutput,
  addToolApprovalResponse: vi.fn(),
  stop: vi.fn(),
});

const callOnAddToolResult = (
  options: Parameters<NonNullable<ExternalStoreAdapter["onAddToolResult"]>>[0],
) => {
  const callback = mocks.adapter?.onAddToolResult;
  expect(callback).toBeDefined();
  return callback!(options);
};

describe("useAISDKRuntime tool output callbacks", () => {
  it("returns the addToolOutput promise for successful results", () => {
    const outputPromise = Promise.resolve();
    const addToolOutput = vi.fn(() => outputPromise);

    renderHook(() =>
      useAISDKRuntime(createChatHelpers(addToolOutput) as never),
    );

    const callbackPromise = callOnAddToolResult({
      messageId: "message-1",
      toolCallId: "tool-call-1",
      toolName: "weather",
      result: { temperature: 72 },
      isError: false,
    });

    expect(callbackPromise).toBe(outputPromise);
    expect(addToolOutput).toHaveBeenCalledWith({
      tool: "weather",
      toolCallId: "tool-call-1",
      output: { temperature: 72 },
      options: { metadata: undefined },
    });
  });

  it("returns the addToolOutput promise for error results", async () => {
    const error = new Error("tool failed");
    const outputPromise = Promise.reject(error);
    void outputPromise.catch(() => undefined);
    const addToolOutput = vi.fn(() => outputPromise);

    renderHook(() =>
      useAISDKRuntime(createChatHelpers(addToolOutput) as never),
    );

    const callbackPromise = callOnAddToolResult({
      messageId: "message-1",
      toolCallId: "tool-call-1",
      toolName: "weather",
      result: "tool failed",
      isError: true,
    });

    expect(callbackPromise).toBe(outputPromise);
    expect(addToolOutput).toHaveBeenCalledWith({
      state: "output-error",
      tool: "weather",
      toolCallId: "tool-call-1",
      errorText: "tool failed",
      options: { metadata: undefined },
    });
    await expect(outputPromise).rejects.toBe(error);
  });
});

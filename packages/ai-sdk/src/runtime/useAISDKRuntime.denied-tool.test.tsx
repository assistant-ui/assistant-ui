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

describe("useAISDKRuntime pending tool completion", () => {
  const setup = (toolPart: Record<string, unknown>) => {
    const messages = [
      {
        id: "m1",
        role: "assistant",
        parts: [toolPart],
      },
    ];
    let updated: any[] | undefined;
    const setMessages = vi.fn(
      (updater: (m: typeof messages) => typeof messages) => {
        updated = typeof updater === "function" ? updater(messages) : updater;
      },
    );
    const chat = {
      id: "chat-1",
      status: "ready",
      error: undefined,
      messages,
      setMessages,
      sendMessage: vi.fn().mockResolvedValue(undefined),
      regenerate: vi.fn(),
      addToolOutput: vi.fn(),
      addToolApprovalResponse: vi.fn(),
      stop: vi.fn(),
    };

    renderHook(() => useAISDKRuntime(chat as never));

    return {
      send: () =>
        mocks.adapter!.onNew!({
          role: "user",
          parentId: "m1",
          sourceId: null,
          runConfig: {},
          content: [{ type: "text", text: "next" }],
          attachments: [],
          createdAt: new Date(0),
          metadata: { custom: {} },
        } as never),
      getUpdated: () => updated,
    };
  };

  it("preserves a denied tool call and its approval record on the next send", async () => {
    const { send, getUpdated } = setup({
      type: "tool-search",
      toolCallId: "call_1",
      state: "output-denied",
      input: { query: "x" },
      approval: { id: "appr_1", approved: false, reason: "too dangerous" },
    });

    await send();

    const updated = getUpdated();
    const part = updated?.at(-1)?.parts?.[0];
    expect(part?.state).toBe("output-denied");
    expect(part?.approval).toEqual({
      id: "appr_1",
      approved: false,
      reason: "too dangerous",
    });
    expect(part?.errorText).toBeUndefined();
  });

  it("still cancels a genuinely pending tool call on the next send", async () => {
    const { send, getUpdated } = setup({
      type: "tool-search",
      toolCallId: "call_1",
      state: "input-available",
      input: { query: "x" },
    });

    await send();

    const part = getUpdated()?.at(-1)?.parts?.[0];
    expect(part?.state).toBe("output-error");
    expect(part?.errorText).toBe(
      "User cancelled tool call by sending a new message.",
    );
  });
});

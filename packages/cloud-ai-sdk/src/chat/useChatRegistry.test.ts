// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useChatRegistry } from "./useChatRegistry";

describe("useChatRegistry", () => {
  it("reuses the same chat for the same selected thread", () => {
    const scope = {};
    const createChat = vi.fn().mockImplementation((chatKey: string) => ({
      id: chatKey,
      messages: [],
    }));

    const { rerender } = renderHook(
      ({ threadId }) =>
        useChatRegistry({
          scope,
          threadId,
          createChat: createChat as never,
        }),
      {
        initialProps: { threadId: "thread-1" as string | null },
      },
    );

    rerender({ threadId: "thread-1" });

    expect(createChat).toHaveBeenCalledTimes(1);
    expect(createChat).toHaveBeenCalledWith("thread-1", expect.anything());
  });

  it("creates a fresh session key after leaving a selected thread", () => {
    const scope = {};
    const createChat = vi.fn().mockImplementation((chatKey: string) => ({
      id: chatKey,
      messages: [],
    }));

    const { rerender } = renderHook(
      ({ threadId }) =>
        useChatRegistry({
          scope,
          threadId,
          createChat: createChat as never,
        }),
      {
        initialProps: { threadId: "thread-1" as string | null },
      },
    );

    rerender({ threadId: null });

    expect(createChat).toHaveBeenCalledTimes(2);
    const firstKey = createChat.mock.calls[0]?.[0];
    const secondKey = createChat.mock.calls[1]?.[0];
    expect(firstKey).toBe("thread-1");
    expect(secondKey).toBeTruthy();
    expect(secondKey).not.toBe("thread-1");
  });

  it("creates a brand-new key immediately when leaving a thread that reused the previous new-chat key", () => {
    const scope = {};
    const createChat = vi.fn().mockImplementation((chatKey: string) => ({
      id: chatKey,
      messages: [],
    }));

    const { result, rerender } = renderHook(
      ({ threadId }) =>
        useChatRegistry({
          scope,
          threadId,
          createChat: createChat as never,
        }),
      {
        initialProps: { threadId: null as string | null },
      },
    );

    const initialNewChatKey = result.current.activeChat.id;
    expect(initialNewChatKey).toBeTruthy();

    result.current.registry.setThreadId(initialNewChatKey, "thread-1");

    rerender({ threadId: "thread-1" });
    expect(result.current.activeChat.id).toBe(initialNewChatKey);

    rerender({ threadId: null });
    expect(result.current.activeChat.id).not.toBe(initialNewChatKey);
  });

  it("creates a new registry and chat when the scope changes", () => {
    const createChat = vi
      .fn()
      .mockImplementation((chatKey: string) => ({ id: chatKey, messages: [] }));
    const scopeA = {};
    const scopeB = {};

    const { result, rerender } = renderHook(
      ({ scope }) =>
        useChatRegistry({
          scope,
          threadId: "thread-1",
          createChat: createChat as never,
        }),
      { initialProps: { scope: scopeA } },
    );
    const registryA = result.current.registry;
    const chatA = result.current.activeChat;

    rerender({ scope: scopeB });

    expect(result.current.registry).not.toBe(registryA);
    expect(result.current.activeChat).not.toBe(chatA);
    expect(createChat).toHaveBeenCalledTimes(2);
  });
});

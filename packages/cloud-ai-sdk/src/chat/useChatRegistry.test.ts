// @vitest-environment jsdom

import { act, render, renderHook } from "@testing-library/react";
import {
  Activity,
  createElement,
  startTransition,
  StrictMode,
  Suspense,
  type ComponentProps,
} from "react";
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

  it("creates a new registry and chat when the scope changes", async () => {
    const stop = vi.fn().mockResolvedValue(undefined);
    const createChat = vi.fn().mockImplementation((chatKey: string) => ({
      id: chatKey,
      messages: [],
      stop,
    }));
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

    await act(async () => {});

    expect(result.current.registry).not.toBe(registryA);
    expect(result.current.activeChat).not.toBe(chatA);
    expect(createChat).toHaveBeenCalledTimes(2);
    expect(stop).toHaveBeenCalledOnce();
    expect(registryA.isDisposed).toBe(true);
    expect(registryA.get("thread-1")).toBe(chatA);
  });

  it("does not stop chats during ordinary rerenders", () => {
    const scope = {};
    const stop = vi.fn().mockResolvedValue(undefined);
    const createChat = vi.fn().mockImplementation((chatKey: string) => ({
      id: chatKey,
      messages: [],
      stop,
    }));

    const { rerender } = renderHook(() =>
      useChatRegistry({
        scope,
        threadId: "thread-1",
        createChat: createChat as never,
      }),
    );

    rerender();

    expect(stop).not.toHaveBeenCalled();
  });

  it("keeps owned chats running during Strict Mode effect replay", async () => {
    const scope = {};
    const stop = vi.fn().mockResolvedValue(undefined);
    const createChat = vi.fn().mockImplementation((chatKey: string) => ({
      id: chatKey,
      messages: [],
      stop,
    }));

    const { unmount } = renderHook(
      () =>
        useChatRegistry({
          scope,
          threadId: "thread-1",
          createChat: createChat as never,
        }),
      { wrapper: StrictMode },
    );

    await act(async () => {
      await new Promise<void>((resolve) => queueMicrotask(resolve));
    });
    expect(stop).not.toHaveBeenCalled();

    unmount();
    await act(async () => {
      await new Promise<void>((resolve) => queueMicrotask(resolve));
    });
    expect(stop).toHaveBeenCalledOnce();
  });

  it("stops owned chats after a production unmount", async () => {
    const scope = {};
    const stop = vi.fn().mockResolvedValue(undefined);
    const createChat = vi.fn().mockImplementation((chatKey: string) => ({
      id: chatKey,
      messages: [],
      stop,
    }));

    const { unmount } = renderHook(() =>
      useChatRegistry({
        scope,
        threadId: "thread-1",
        createChat: createChat as never,
      }),
    );

    unmount();
    await act(async () => {});

    expect(stop).toHaveBeenCalledOnce();
  });

  it("keeps owned chats running while an Activity is hidden", async () => {
    const scope = {};
    const stop = vi.fn().mockResolvedValue(undefined);
    const createChat = vi.fn().mockImplementation((chatKey: string) => ({
      id: chatKey,
      messages: [],
      stop,
    }));
    const Probe = () => {
      useChatRegistry({
        scope,
        threadId: "thread-1",
        createChat: createChat as never,
      });
      return null;
    };
    const app = (mode: "visible" | "hidden") =>
      createElement(
        Activity,
        { mode } as ComponentProps<typeof Activity>,
        createElement(Probe),
      );

    const view = render(app("visible"));

    view.rerender(app("hidden"));
    await act(async () => {});
    expect(stop).not.toHaveBeenCalled();

    view.rerender(app("visible"));
    await act(async () => {});
    expect(stop).not.toHaveBeenCalled();

    view.unmount();
    await act(async () => {});
    expect(stop).toHaveBeenCalledOnce();
  });

  it("does not register chats from abandoned renders", () => {
    const scope = {};
    const pending = new Promise<never>(() => {});
    const createChat = vi.fn().mockImplementation((chatKey: string) => ({
      id: chatKey,
      messages: [],
      source: "committed fallback",
    }));

    const Probe = ({
      threadId,
      source,
      suspend,
    }: {
      threadId: string;
      source: string;
      suspend: boolean;
    }) => {
      const { activeChat } = useChatRegistry({
        scope,
        threadId,
        createChat: createChat as never,
        createRenderChat: ((chatKey: string) => ({
          id: chatKey,
          messages: [],
          source,
        })) as never,
      });
      if (suspend) throw pending;
      return createElement(
        "span",
        null,
        (activeChat as unknown as { source: string }).source,
      );
    };
    const renderProbe = (threadId: string, source: string, suspend: boolean) =>
      createElement(
        Suspense,
        { fallback: null },
        createElement(Probe, { threadId, source, suspend }),
      );

    const view = render(renderProbe("thread-a", "account-a", false));

    act(() => {
      startTransition(() => {
        view.rerender(renderProbe("thread-b", "abandoned", true));
      });
    });

    expect(view.container.textContent).toBe("account-a");

    view.rerender(renderProbe("thread-b", "committed", false));

    expect(view.container.textContent).toBe("committed");
  });
});

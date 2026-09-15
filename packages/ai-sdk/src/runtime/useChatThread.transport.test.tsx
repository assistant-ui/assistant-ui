// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Chat } from "@ai-sdk/react";
import {
  AssistantChatTransport,
  type InitializableThreadListItem,
} from "../transport/AssistantChatTransport";
import { useChatThread } from "./useChatThread";

const itemFor = (remoteId: string) => ({
  initialize: async () => ({ remoteId, externalId: undefined }),
});

describe("useChatThread shared transport isolation", () => {
  it("gives each thread its own clone wired to its own thread-list item", async () => {
    const transport = new AssistantChatTransport({ api: "/api/chat" });
    const setRuntime = vi.spyOn(transport, "setRuntime");
    const setGetItem = vi.spyOn(transport, "__internal_setGetThreadListItem");

    // Capture each per-thread clone and the thread-list getter wired onto it.
    const clones: AssistantChatTransport<never>[] = [];
    const getters: (() => InitializableThreadListItem | undefined)[] = [];
    const realClone = transport.__internal_clone.bind(transport);
    vi.spyOn(transport, "__internal_clone").mockImplementation(() => {
      const clone = realClone();
      clones.push(clone as AssistantChatTransport<never>);
      vi.spyOn(clone, "__internal_setGetThreadListItem").mockImplementation(
        (getter) => {
          getters[clones.length - 1] = getter;
        },
      );
      return clone;
    });

    renderHook(() =>
      useChatThread(
        { transport },
        {
          id: "thread-a",
          isMainThread: true,
          getThreadListItem: () => itemFor("remote-a"),
        },
      ),
    );
    renderHook(() =>
      useChatThread(
        { transport },
        {
          id: "thread-b",
          isMainThread: false,
          getThreadListItem: () => itemFor("remote-b"),
        },
      ),
    );

    // The caller's instance is never wired; two distinct clones are — so a
    // sibling thread's render can never re-point another thread's request.
    expect(setRuntime).not.toHaveBeenCalled();
    expect(setGetItem).not.toHaveBeenCalled();
    expect(clones).toHaveLength(2);
    expect(clones[0]).not.toBe(clones[1]);

    // Each clone routes to its own thread's remoteId, not a shared one.
    const remoteIdOf = async (
      getter?: () => InitializableThreadListItem | undefined,
    ) => (await getter?.()?.initialize())?.remoteId;
    expect(await remoteIdOf(getters[0])).toBe("remote-a");
    expect(await remoteIdOf(getters[1])).toBe("remote-b");
  });

  it("uses the supplied instance when the caller owns the chat", () => {
    const transport = new AssistantChatTransport({ api: "/api/chat" });
    const clone = vi.spyOn(transport, "__internal_clone");
    const chat = new Chat({ id: "thread-a", transport });

    renderHook(() =>
      useChatThread(
        { transport },
        {
          id: "thread-a",
          isMainThread: true,
          getThreadListItem: () => itemFor("remote-a"),
          chat,
        },
      ),
    );

    // A caller-owned chat is already bound to its transport, so cloning again
    // would wire an instance the chat never sends through.
    expect(clone).not.toHaveBeenCalled();
  });
});

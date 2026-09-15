// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Chat } from "@ai-sdk/react";
import { AssistantChatTransport } from "../transport/AssistantChatTransport";
import { useChatThread } from "./useChatThread";

const itemFor = (remoteId: string) => ({
  initialize: async () => ({ remoteId, externalId: undefined }),
});

describe("useChatThread shared transport isolation", () => {
  it("wires a per-thread clone, never the caller's shared instance", () => {
    const transport = new AssistantChatTransport({ api: "/api/chat" });
    const setRuntime = vi.spyOn(transport, "setRuntime");
    const setGetThreadListItem = vi.spyOn(
      transport,
      "__internal_setGetThreadListItem",
    );

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

    // Each thread clones and wires its own copy, so the source instance the
    // caller holds is never re-pointed by a sibling thread's render.
    expect(setRuntime).not.toHaveBeenCalled();
    expect(setGetThreadListItem).not.toHaveBeenCalled();
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

// @vitest-environment jsdom

import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { AssistantChatTransport } from "../transport/AssistantChatTransport";
import { useChatThread } from "./useChatThread";

const sse = (lines: string[]) => lines.map((l) => `data: ${l}\n\n`).join("");

const itemFor = (remoteId: string) => ({
  initialize: async () => ({ remoteId, externalId: undefined }),
});

afterEach(() => vi.unstubAllGlobals());

describe("useChatThread shared transport isolation", () => {
  it("does not mutate the caller's transport wiring across mounted threads", () => {
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

    // Each thread wires its own clone, so the shared source instance the
    // caller holds is never re-pointed by a sibling thread.
    expect(setRuntime).not.toHaveBeenCalled();
    expect(setGetThreadListItem).not.toHaveBeenCalled();
  });

  it("routes each mounted thread's request to its own remoteId", async () => {
    const bodies: { id?: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_i: unknown, init?: RequestInit) => {
        bodies.push(JSON.parse(init!.body as string));
        return new Response(
          sse(['{"type":"start"}', '{"type":"finish"}', "[DONE]"]),
          { headers: { "content-type": "text/event-stream" } },
        );
      }),
    );

    const transport = new AssistantChatTransport({ api: "/api/chat" });
    const threadA = renderHook(() =>
      useChatThread(
        { transport },
        {
          id: "thread-a",
          isMainThread: true,
          getThreadListItem: () => itemFor("remote-a"),
        },
      ),
    );
    const threadB = renderHook(() =>
      useChatThread(
        { transport },
        {
          id: "thread-b",
          isMainThread: false,
          getThreadListItem: () => itemFor("remote-b"),
        },
      ),
    );

    await act(async () => {
      await threadA.result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "from a" }],
      });
    });
    await act(async () => {
      await threadB.result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "from b" }],
      });
    });

    expect(bodies.map((b) => b.id)).toEqual(["remote-a", "remote-b"]);
  });
});

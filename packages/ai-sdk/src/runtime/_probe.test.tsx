// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { AssistantChatTransport } from "../transport/AssistantChatTransport";
import { useChatThread } from "./useChatThread";

const sse = (l: string[]) => l.map((x) => `data: ${x}\n\n`).join("");
afterEach(() => vi.unstubAllGlobals());

const itemFor = (r: string) => ({
  initialize: async () => ({ remoteId: r, externalId: undefined }),
});

describe("probe", () => {
  it("A last-render, then B sends", async () => {
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
    const A = renderHook(() =>
      useChatThread(
        { transport },
        {
          id: "thread-a",
          isMainThread: true,
          getThreadListItem: () => itemFor("remote-a"),
        },
      ),
    );
    const B = renderHook(() =>
      useChatThread(
        { transport },
        {
          id: "thread-b",
          isMainThread: false,
          getThreadListItem: () => itemFor("remote-b"),
        },
      ),
    );
    // force A to be last renderer -> shared transport points at A
    await act(async () => {
      A.rerender();
    });
    // B sends
    await act(async () => {
      B.result.current.thread.append({
        role: "user",
        content: [{ type: "text", text: "b" }],
      });
      await new Promise((r) => setTimeout(r, 30));
    });
    console.log("B_ROUTED_TO:", bodies[0]?.id);
    expect(bodies[0]?.id).toBe("remote-b");
  });
});

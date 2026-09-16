// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { Chat } from "@ai-sdk/react";
import { AssistantChatTransport } from "../transport/AssistantChatTransport";
import { useChatThread } from "./useChatThread";

const itemFor = (remoteId: string) => ({
  initialize: async () => ({ remoteId, externalId: undefined }),
});

const finishedStream = () =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"type":"start"}\n\ndata: {"type":"finish"}\n\ndata: [DONE]\n\n',
          ),
        );
        controller.close();
      },
    }),
    { headers: { "content-type": "text/event-stream" } },
  );

describe("useChatThread shared transport isolation", () => {
  it("sends each thread's request with that thread's remoteId and model context", async () => {
    const sent: { id: unknown; system: unknown }[] = [];
    const transport = new AssistantChatTransport({
      api: "/api/chat",
      fetch: async (_input, init) => {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        sent.push({ id: body["id"], system: body["system"] });
        return finishedStream();
      },
    });

    const mount = (id: string, remoteId: string, system: string) =>
      renderHook(() => {
        const runtime = useChatThread(
          { transport },
          {
            id,
            isMainThread: id === "thread-a",
            getThreadListItem: () => itemFor(remoteId),
          },
        );
        useEffect(
          () =>
            runtime.registerModelContextProvider({
              getModelContext: () => ({ system }),
            }),
          [runtime],
        );
        return runtime;
      });

    const threadA = mount("thread-a", "remote-a", "system-a");
    const threadB = mount("thread-b", "remote-b", "system-b");

    threadB.rerender();

    await act(async () => {
      threadA.result.current.thread.append("hello");
    });

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ id: "remote-a", system: "system-a" });
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

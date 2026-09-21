// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { useEffect } from "react";
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
  it("gives each thread its own clone wired to its own thread-list item", async () => {
    const transport = new AssistantChatTransport({ api: "/api/chat" });
    const setRuntime = vi.spyOn(transport, "setRuntime");
    const setGetItem = vi.spyOn(transport, "__internal_setGetThreadListItem");
    const clones: AssistantChatTransport<never>[] = [];
    const getters: (() => InitializableThreadListItem | undefined)[] = [];
    const realClone = transport.__internal_clone.bind(transport);
    vi.spyOn(transport, "__internal_clone").mockImplementation(() => {
      const clone = realClone();
      const index = clones.push(clone as AssistantChatTransport<never>) - 1;
      vi.spyOn(clone, "__internal_setGetThreadListItem").mockImplementation(
        (getter) => {
          getters[index] = getter;
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

    expect(setRuntime).not.toHaveBeenCalled();
    expect(setGetItem).not.toHaveBeenCalled();
    expect(clones).toHaveLength(2);
    expect(clones[0]).not.toBe(clones[1]);

    const remoteIdOf = async (
      getter?: () => InitializableThreadListItem | undefined,
    ) => (await getter?.()?.initialize())?.remoteId;
    expect(await remoteIdOf(getters[0])).toBe("remote-a");
    expect(await remoteIdOf(getters[1])).toBe("remote-b");
  });

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

    threadA.rerender();

    await act(async () => {
      threadB.result.current.thread.append("hello");
    });

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ id: "remote-b", system: "system-b" });
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

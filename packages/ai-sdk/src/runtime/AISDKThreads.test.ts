// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import type { AssistantCloud } from "assistant-cloud";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig, createAssistantClient } from "@assistant-ui/store/client";
import { AISDKThreads } from "./AISDKThreads";
import { AssistantChatTransport } from "../transport/AssistantChatTransport";
import {
  createCancellableTransport,
  createControlledTransport,
} from "./__tests__/controlled-transport";

const textReply = (text: string) =>
  [
    { type: "start" },
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: text },
    { type: "text-end", id: "t1" },
    { type: "finish" },
  ] as never[];

const threadText = (aui: ReturnType<typeof createAssistantClient>) =>
  aui
    .getClient()
    .thread.getState()
    .messages.map((m) =>
      m.content.map((part) => (part.type === "text" ? part.text : "")).join(""),
    );

describe("AISDKThreads", () => {
  it("runs one chat per thread and keeps histories isolated across switches", async () => {
    const { transport, emit, close } = createControlledTransport();
    const handle = createAssistantClient(
      AuiConfig({ threads: AISDKThreads({ transport }) }),
    );
    handle.subscribe(() => {});
    const aui = handle.getClient();

    expect(aui.threads.getState().threadIds).toEqual(["main"]);

    flushTapSync(() => aui.composer.setText("first question"));
    flushTapSync(() => aui.composer.send());
    await vi.waitFor(() => {
      expect(
        handle.getClient().thread.getState().messages.length,
      ).toBeGreaterThan(0);
    });
    emit(...textReply("first answer"));
    close();
    await vi.waitFor(() => {
      expect(threadText(handle as never)).toEqual([
        "first question",
        "first answer",
      ]);
      expect(handle.getClient().thread.getState().isRunning).toBe(false);
    });

    flushTapSync(() => aui.threads.switchToNewThread());
    const state = handle.getClient().threads.getState();
    expect(state.threadIds).toHaveLength(2);
    expect(state.mainThreadId).not.toBe("main");
    expect(handle.getClient().thread.getState().messages).toHaveLength(0);

    flushTapSync(() => handle.getClient().threads.switchToThread("main"));
    expect(handle.getClient().threads.getState().mainThreadId).toBe("main");
    expect(threadText(handle as never)).toEqual([
      "first question",
      "first answer",
    ]);

    handle.destroy();
  });

  it("keeps a switched-away thread streaming in the background", async () => {
    const { transport, emit, close } = createControlledTransport();
    const handle = createAssistantClient(
      AuiConfig({ threads: AISDKThreads({ transport: () => transport }) }),
    );
    handle.subscribe(() => {});
    const aui = handle.getClient();

    flushTapSync(() => aui.composer.setText("stream me"));
    flushTapSync(() => aui.composer.send());
    await vi.waitFor(() => {
      expect(
        handle.getClient().thread.getState().messages.length,
      ).toBeGreaterThan(0);
    });
    emit(
      { type: "start" },
      { type: "text-start", id: "t1" },
      { type: "text-delta", id: "t1", delta: "partial" },
    );

    flushTapSync(() => aui.threads.switchToNewThread());
    expect(handle.getClient().thread.getState().messages).toHaveLength(0);

    emit(
      { type: "text-delta", id: "t1", delta: " and finished" },
      { type: "text-end", id: "t1" },
      { type: "finish" },
    );
    close();

    flushTapSync(() => handle.getClient().threads.switchToThread("main"));
    await vi.waitFor(() => {
      expect(threadText(handle as never)).toEqual([
        "stream me",
        "partial and finished",
      ]);
      expect(handle.getClient().thread.getState().isRunning).toBe(false);
    });

    handle.destroy();
  });

  it("stops all in-flight chats when its client is destroyed", async () => {
    const chats: ReturnType<typeof createCancellableTransport>[] = [];
    const handle = createAssistantClient(
      AuiConfig({
        threads: AISDKThreads({
          transport: () => {
            const chat = createCancellableTransport();
            chats.push(chat);
            return chat.transport;
          },
        }),
      }),
    );
    handle.subscribe(() => {});
    const aui = handle.getClient();

    try {
      flushTapSync(() => aui.composer.setText("first"));
      flushTapSync(() => aui.composer.send());
      await vi.waitFor(() => {
        expect(aui.thread.getState().isRunning).toBe(true);
      });

      flushTapSync(() => aui.threads.switchToNewThread());
      flushTapSync(() => handle.getClient().composer.setText("second"));
      flushTapSync(() => handle.getClient().composer.send());
      await vi.waitFor(() => {
        expect(chats).toHaveLength(2);
        expect(handle.getClient().thread.getState().isRunning).toBe(true);
      });
    } finally {
      handle.destroy();
    }

    await vi.waitFor(() => {
      expect(chats.map((chat) => chat.getCancelCount())).toEqual([1, 1]);
    });
  });

  it("wires model context and per-thread transports onto the wire", async () => {
    const bodies: unknown[] = [];
    const fetchStub = vi.fn(async (_url: unknown, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(
        new ReadableStream({
          start(c) {
            c.enqueue(
              new TextEncoder().encode(
                'data: {"type":"start"}\n\ndata: [DONE]\n\n',
              ),
            );
            c.close();
          },
        }),
        { headers: { "Content-Type": "text/event-stream" } },
      );
    });
    vi.stubGlobal("fetch", fetchStub);
    try {
      const transports: AssistantChatTransport<never>[] = [];
      const handle = createAssistantClient(
        AuiConfig({
          threads: AISDKThreads({
            transport: () => {
              const transport = new AssistantChatTransport();
              transports.push(transport as AssistantChatTransport<never>);
              return transport;
            },
          }),
        }),
      );
      handle.subscribe(() => {});
      const aui = handle.getClient();

      flushTapSync(() =>
        aui.modelContext.register({
          getModelContext: () => ({ system: "wired system prompt" }),
        }),
      );
      flushTapSync(() => aui.composer.setText("hello"));
      flushTapSync(() => aui.composer.send());
      await vi.waitFor(() => expect(fetchStub).toHaveBeenCalledTimes(1));
      expect(bodies[0]).toMatchObject({ system: "wired system prompt" });

      flushTapSync(() => aui.threads.switchToNewThread());
      await vi.waitFor(() => expect(transports.length).toBe(2));
      expect(transports[0]).not.toBe(transports[1]);

      handle.destroy();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("bridges model context on the default transport path", async () => {
    const bodies: unknown[] = [];
    const fetchStub = vi.fn(async (_url: unknown, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(
        new ReadableStream({
          start(c) {
            c.enqueue(
              new TextEncoder().encode(
                'data: {"type":"start"}\n\ndata: [DONE]\n\n',
              ),
            );
            c.close();
          },
        }),
        { headers: { "Content-Type": "text/event-stream" } },
      );
    });
    vi.stubGlobal("fetch", fetchStub);
    try {
      const handle = createAssistantClient(
        AuiConfig({ threads: AISDKThreads() }),
      );
      handle.subscribe(() => {});
      const aui = handle.getClient();

      flushTapSync(() =>
        aui.modelContext.register({
          getModelContext: () => ({ system: "default path system" }),
        }),
      );
      flushTapSync(() => aui.composer.setText("hello"));
      flushTapSync(() => aui.composer.send());
      await vi.waitFor(() => expect(fetchStub).toHaveBeenCalledTimes(1));
      expect(bodies[0]).toMatchObject({ system: "default path system" });

      handle.destroy();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("forwards ChatInit callbacks to each thread's chat", async () => {
    const { transport, emit, close } = createControlledTransport();
    const onFinish = vi.fn();
    const handle = createAssistantClient(
      AuiConfig({
        threads: AISDKThreads({ transport: () => transport, onFinish }),
      }),
    );
    handle.subscribe(() => {});
    const aui = handle.getClient();

    flushTapSync(() => aui.composer.setText("hi"));
    flushTapSync(() => aui.composer.send());
    await vi.waitFor(() => {
      expect(
        handle.getClient().thread.getState().messages.length,
      ).toBeGreaterThan(0);
    });
    emit(...textReply("done"));
    close();
    await vi.waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));

    handle.destroy();
  });

  it("posts each thread's own id as the chat id", async () => {
    const bodies: unknown[] = [];
    const fetchStub = vi.fn(async (_url: unknown, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(
        new ReadableStream({
          start(c) {
            c.enqueue(
              new TextEncoder().encode(
                'data: {"type":"start"}\n\ndata: [DONE]\n\n',
              ),
            );
            c.close();
          },
        }),
        { headers: { "Content-Type": "text/event-stream" } },
      );
    });
    vi.stubGlobal("fetch", fetchStub);
    try {
      const handle = createAssistantClient(
        AuiConfig({ threads: AISDKThreads() }),
      );
      handle.subscribe(() => {});
      const aui = handle.getClient();

      flushTapSync(() => aui.composer.setText("hello"));
      flushTapSync(() => aui.composer.send());
      await vi.waitFor(() => expect(fetchStub).toHaveBeenCalledTimes(1));
      expect(bodies[0]).toMatchObject({ id: "main" });

      flushTapSync(() => aui.threads.switchToNewThread());
      const newThreadId = handle.getClient().threads.getState().mainThreadId;
      flushTapSync(() => handle.getClient().composer.setText("hi again"));
      flushTapSync(() => handle.getClient().composer.send());
      await vi.waitFor(() => expect(fetchStub).toHaveBeenCalledTimes(2));
      expect(bodies[1]).toMatchObject({ id: newThreadId });

      handle.destroy();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("uses assistant-cloud for listing and lifecycle actions", async () => {
    const cloudThread = (id: string) => ({
      id,
      title: id,
      is_archived: false,
      last_message_at: null,
      external_id: null,
      metadata: null,
    });
    const list = vi.fn(async () => ({
      threads: [cloudThread("cloud-1"), cloudThread("cloud-2")],
    }));
    const create = vi.fn(async () => ({ thread_id: "cloud-created" }));
    const deleteThread = vi.fn(async () => {});
    const cloud = {
      threads: {
        list,
        create,
        update: vi.fn(async () => {}),
        delete: deleteThread,
        get: vi.fn(async (id: string) => cloudThread(id)),
        messages: { list: vi.fn(async () => ({ messages: [] })) },
      },
      runs: { stream: vi.fn() },
    } as unknown as AssistantCloud;
    const handle = createAssistantClient(
      AuiConfig({ threads: AISDKThreads({ cloud }) }),
    );
    handle.subscribe(() => {});
    const aui = handle.getClient();
    try {
      await aui.threads.getLoadThreadsPromise();
      await vi.waitFor(() => {
        expect(aui.threads.getState().threadIds).toEqual([
          "cloud-1",
          "cloud-2",
        ]);
      });

      flushTapSync(() => aui.threads.switchToThread("cloud-1"));
      await vi.waitFor(() => {
        expect(aui.threads.getState().mainThreadId).toBe("cloud-1");
      });

      flushTapSync(() => aui.threads.switchToThread("cloud-2"));
      await vi.waitFor(() => {
        expect(aui.threads.getState().mainThreadId).toBe("cloud-2");
      });

      flushTapSync(() => aui.threads.switchToNewThread());
      const newThreadId = handle.getClient().threads.getState().mainThreadId;
      await handle.getClient().threads.item("main").initialize();
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ external_id: undefined }),
      );
      await vi.waitFor(() => {
        expect(
          handle.getClient().threads.item({ id: newThreadId }).getState()
            .remoteId,
        ).toBe("cloud-created");
      });

      await handle.getClient().threads.item({ id: "cloud-1" }).delete();
      expect(deleteThread).toHaveBeenCalledWith("cloud-1");
    } finally {
      handle.destroy();
    }
  });
});

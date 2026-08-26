// @vitest-environment jsdom

import { act, render, renderHook } from "@testing-library/react";
import {
  createElement,
  startTransition,
  Suspense,
  useLayoutEffect,
} from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { UseThreadsResult } from "../types";
import { CloudChatCore } from "../core/CloudChatCore";
import { ChatRegistry } from "./ChatRegistry";
import { useCloudChat } from "./useCloudChat";
import { useCloudChatCore } from "./useCloudChatCore";

function createThreads(
  cloud: unknown,
  threadId: string | null,
): UseThreadsResult {
  return {
    cloud: cloud as never,
    threads: [],
    isLoading: false,
    error: null,
    refresh: vi.fn().mockResolvedValue(true),
    get: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(true),
    rename: vi.fn().mockResolvedValue(true),
    archive: vi.fn().mockResolvedValue(true),
    unarchive: vi.fn().mockResolvedValue(true),
    threadId,
    selectThread: vi.fn(),
    generateTitle: vi.fn().mockResolvedValue(null),
  };
}

describe("useCloudChat thread switching", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resets visible chat messages immediately when switching to new chat (threadId -> null)", () => {
    const mockCloud = {
      threads: {
        create: vi.fn(),
        list: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
      },
    };

    const threads = createThreads(mockCloud, "thread-1");

    const { result, rerender } = renderHook(
      ({ tid }) => {
        threads.threadId = tid;
        return useCloudChat({ threads: threads });
      },
      { initialProps: { tid: "thread-1" as string | null } },
    );

    act(() => {
      result.current.setMessages([
        { id: "m1", role: "user", parts: [{ type: "text", text: "hello" }] },
      ]);
    });
    expect(result.current.messages).toHaveLength(1);

    rerender({ tid: null });

    expect(result.current.messages).toHaveLength(0);
  });

  it("keeps the committed chat active when a Cloud scope switch suspends", () => {
    const stopAll = vi
      .spyOn(ChatRegistry.prototype, "stopAll")
      .mockResolvedValue(undefined);
    const cloudA = { threads: {} };
    const cloudB = { threads: {} };
    const threadsA = createThreads(cloudA, null);
    const threadsB = createThreads(cloudB, null);
    const pending = new Promise<never>(() => {});

    const Probe = ({
      threads,
      suspend,
    }: {
      threads: UseThreadsResult;
      suspend: boolean;
    }) => {
      useCloudChat({ threads });
      if (suspend) throw pending;
      return null;
    };
    const renderProbe = (threads: UseThreadsResult, suspend: boolean) =>
      createElement(
        Suspense,
        { fallback: null },
        createElement(Probe, { threads, suspend }),
      );

    const view = render(renderProbe(threadsA, false));
    view.rerender(renderProbe(threadsB, true));
    view.rerender(renderProbe(threadsA, false));

    expect(stopAll).not.toHaveBeenCalled();
  });

  it("keeps committed options active when an options update suspends", async () => {
    const cloud = {
      threads: {
        create: vi.fn().mockResolvedValue({ thread_id: "thread-1" }),
      },
    };
    const threadsA = createThreads(cloud, null);
    const threadsB = createThreads(cloud, null);
    const transportA = {
      sendMessages: vi.fn(),
      reconnectToStream: vi.fn().mockResolvedValue(null),
    };
    const transportB = {
      sendMessages: vi.fn(),
      reconnectToStream: vi.fn().mockResolvedValue(null),
    };
    const pending = new Promise<never>(() => {});
    let core: CloudChatCore | undefined;

    const Probe = ({
      label,
      threads,
      transport,
      suspend,
    }: {
      label: string;
      threads: UseThreadsResult;
      transport: typeof transportA;
      suspend: boolean;
    }) => {
      const currentCore = useCloudChatCore(cloud as never, {
        threads,
        chatConfig: {},
        transport: transport as never,
      });
      core ??= currentCore;
      if (suspend) throw pending;
      return createElement("span", null, label);
    };
    const renderProbe = (
      label: string,
      threads: UseThreadsResult,
      transport: typeof transportA,
      suspend: boolean,
    ) =>
      createElement(
        Suspense,
        { fallback: null },
        createElement(Probe, { label, threads, transport, suspend }),
      );

    const view = render(renderProbe("account-a", threadsA, transportA, false));

    act(() => {
      startTransition(() => {
        view.rerender(renderProbe("account-b", threadsB, transportB, true));
      });
    });

    expect(view.container.textContent).toBe("account-a");

    const registry = new ChatRegistry(() => ({}) as never);
    await core
      ?.createTransport("transport-chat", registry)
      .reconnectToStream({} as never);
    await core?.ensureThreadId("thread-chat", registry);

    expect(transportA.reconnectToStream).toHaveBeenCalledOnce();
    expect(transportB.reconnectToStream).not.toHaveBeenCalled();
    expect(threadsA.selectThread).toHaveBeenCalledWith("thread-1");
    expect(threadsB.selectThread).not.toHaveBeenCalled();
  });

  it("applies a committed transport before any effect in the same commit", async () => {
    const cloud = {
      threads: {
        create: vi.fn().mockResolvedValue({ thread_id: "thread-1" }),
      },
    };
    const threads = createThreads(cloud, null);
    const transportA = {
      sendMessages: vi.fn(),
      reconnectToStream: vi.fn().mockResolvedValue(null),
    };
    const transportB = {
      sendMessages: vi.fn(),
      reconnectToStream: vi.fn().mockResolvedValue(null),
    };
    const registry = new ChatRegistry(() => ({}) as never);

    const Probe = ({
      transport,
      reconnect,
    }: {
      transport: typeof transportA;
      reconnect: boolean;
    }) => {
      const core = useCloudChatCore(cloud as never, {
        threads,
        chatConfig: {},
        transport: transport as never,
      });
      useLayoutEffect(() => {
        if (!reconnect) return;
        void core
          .createTransport("transport-chat", registry)
          .reconnectToStream({} as never);
      });
      return null;
    };

    const view = render(
      createElement(Probe, { transport: transportA, reconnect: false }),
    );

    await act(async () => {
      view.rerender(
        createElement(Probe, { transport: transportB, reconnect: true }),
      );
    });

    expect(transportB.reconnectToStream).toHaveBeenCalledOnce();
    expect(transportA.reconnectToStream).not.toHaveBeenCalled();
  });

  it("retries an interrupted history load when switching back to a thread", () => {
    const interruptedLoad = new Promise<void>(() => {});
    let threadALoads = 0;
    const loadThreadMessages = vi
      .spyOn(CloudChatCore.prototype, "loadThreadMessages")
      .mockImplementation((threadId) => {
        if (threadId === "thread-a") {
          threadALoads += 1;
          if (threadALoads === 1) return interruptedLoad;
        }
        return Promise.resolve();
      });

    const mockCloud = {
      threads: {
        create: vi.fn(),
        list: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
      },
    };
    const threads = createThreads(mockCloud, "thread-a");

    const { rerender } = renderHook(
      ({ tid }) => {
        threads.threadId = tid;
        return useCloudChat({ threads });
      },
      { initialProps: { tid: "thread-a" as string | null } },
    );

    rerender({ tid: "thread-b" });
    rerender({ tid: "thread-a" });

    expect(
      loadThreadMessages.mock.calls.filter(
        ([threadId]) => threadId === "thread-a",
      ),
    ).toHaveLength(2);
  });
});

import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { flushTapSync, resource, withKey } from "@assistant-ui/tap";
import { useAui } from "@assistant-ui/store";
import {
  AuiConfig,
  createAssistantClient,
  type AssistantConfigSource,
  useAssistantEmit,
} from "@assistant-ui/store/client";
import type { ThreadHistoryAdapter } from "../../adapters/thread-history";
import { ExternalStoreRuntimeCore } from "../../runtimes/external-store/external-store-runtime-core";
import type { ExternalStoreAdapter } from "../../runtimes/external-store/external-store-adapter";
import type {
  RemoteThreadListAdapter,
  RemoteThreadMetadata,
} from "../../runtimes/remote-thread-list/types";
import type { ThreadMessageLike } from "../../runtime/utils/thread-message-like";
import { AssistantRuntimeImpl } from "../../runtime/internal";
import { ThreadClient } from "../../store/runtime-clients/thread-runtime-client";
import type { AppendMessage } from "../../types/message";
import {
  useRuntimeAdapters,
  type RuntimeAdapters,
} from "../runtimes/RuntimeAdapterProvider";
import { OptimisticState } from "../../runtimes/remote-thread-list/optimistic-state";
import {
  getThreadData,
  type RemoteThreadState,
} from "../../runtimes/remote-thread-list/remote-thread-state";
import { RemoteThreadList } from "./RemoteThreadList";
import { createLocalStorageAdapter } from "../adapters/LocalStorageThreadListAdapter";

const waitFor = (assertion: () => void) =>
  vi.waitFor(assertion, { interval: 10 });

const stubComposer = { getState: () => ({}) };
const stubSuggestions = { getState: () => ({ suggestions: [] }) };

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const useStubThread = (props: {
  threadId: string;
  refetch?: (() => Promise<void>) | undefined;
  isRunning?: boolean | undefined;
  messages?: readonly ThreadMessageLike[] | undefined;
}) => ({
  getState: () => ({
    isRunning: props.isRunning === true,
    messages: props.messages ?? [],
  }),
  composer: () => stubComposer,
  suggestions: () => stubSuggestions,
  unstable_refetchThread: props.refetch,
});
const StubThread = resource(useStubThread);

const dummyHistory = (): ThreadHistoryAdapter => ({
  load: async () => ({ messages: [] }),
  append: async () => {},
});

const useHistoryAdapters = (history: ThreadHistoryAdapter) => () => ({
  history,
});

const useCapturingThread = (props: {
  threadId: string;
  capture: { adapters: RuntimeAdapters | null };
}) => {
  props.capture.adapters = useRuntimeAdapters();
  return useStubThread(props);
};
const CapturingThread = resource(useCapturingThread);

const useCountingThread = (props: {
  threadId: string;
  mounts: { n: number };
}) => {
  useState(() => {
    props.mounts.n += 1;
    return props.mounts.n;
  });
  return useStubThread(props);
};
const CountingThread = resource(useCountingThread);

const useHistoryLoadingThread = (props: { threadId: string }) => {
  const adapters = useRuntimeAdapters();
  useState(() => {
    void adapters?.history?.load();
    return true;
  });
  return useStubThread(props);
};
const HistoryLoadingThread = resource(useHistoryLoadingThread);

const makeAdapter = (
  overrides: Partial<RemoteThreadListAdapter> = {},
): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({ threads: [] })),
  initialize: vi.fn(async (threadId: string) => ({
    remoteId: `remote-${threadId}`,
    externalId: undefined,
  })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  generateTitle: vi.fn(
    async () =>
      new ReadableStream({
        start(controller) {
          controller.close();
        },
      }) as never,
  ),
  fetch: vi.fn(async (id: string) => ({
    status: "regular" as const,
    remoteId: id,
    externalId: undefined,
    title: id,
  })),
  ...overrides,
});

describe("RemoteThreadList draft custom metadata", () => {
  it("passes draft metadata to initialize without updating the adapter, then updates initialized metadata", async () => {
    const updateCustom = vi.fn(async () => {});
    const adapter = makeAdapter({ updateCustom });
    const { handle } = mountList(adapter);
    await handle.getClient().threads.getLoadThreadsPromise();
    const draftId = handle.getClient().threads.getState().mainThreadId;

    flushTapSync(() => {
      handle.getClient().threads.item("main").updateCustom({ label: "draft" });
    });
    expect(handle.getClient().threads.item("main").getState().custom).toEqual({
      label: "draft",
    });
    expect(updateCustom).not.toHaveBeenCalled();

    await handle.getClient().threads.item("main").initialize();
    expect(adapter.initialize).toHaveBeenCalledWith(draftId, {
      custom: { label: "draft" },
    });
    expect(updateCustom).not.toHaveBeenCalled();

    await handle
      .getClient()
      .threads.item("main")
      .updateCustom({ label: "saved" });
    expect(updateCustom).toHaveBeenCalledWith(`remote-${draftId}`, {
      label: "saved",
    });
    handle.destroy();
  });
});

const mountList = (
  adapter: RemoteThreadListAdapter,
  threadId?: string,
  refetch?: () => Promise<void>,
  onSwitchToThread?: (id: string) => void,
  onDelete?: (id: string) => void,
  providedOnThreadIdChange?: (id: string | undefined) => void,
) => {
  const onThreadIdChange = providedOnThreadIdChange ?? vi.fn();
  const handle = createAssistantClient(
    AuiConfig({
      threads: RemoteThreadList({
        adapter,
        thread: (id) => StubThread({ threadId: id, refetch }) as never,
        threadId,
        onThreadIdChange,
        onSwitchToThread,
        onDelete,
      }),
    }),
  );
  handle.subscribe(() => {});
  return { handle, onThreadIdChange };
};

const mountListWithTitleMessage = (adapter: RemoteThreadListAdapter) => {
  const titleMessage: ThreadMessageLike = {
    id: "m1",
    role: "user",
    content: [{ type: "text", text: "hello" }],
  };
  const handle = createAssistantClient(
    AuiConfig({
      threads: RemoteThreadList({
        adapter,
        thread: (id) =>
          StubThread({ threadId: id, messages: [titleMessage] }) as never,
      }),
    }),
  );
  handle.subscribe(() => {});
  return { handle };
};

describe("RemoteThreadList without adapter unarchive", () => {
  const makeArchivedAdapter = () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "archived" as const, remoteId: "archived" }],
      })),
    });
    delete adapter.unarchive;
    return adapter;
  };

  it("opens an archived thread and keeps it archived", async () => {
    const { handle } = mountList(makeArchivedAdapter());
    try {
      const threads = handle.getClient().threads;
      await threads.getLoadThreadsPromise();
      expect(threads.getState().canUnarchive).toBe(false);
      await waitFor(() =>
        expect(threads.getState().archivedThreadIds).toContain("archived"),
      );

      await expect(
        threads.__internal_getRawActions!().switchToThread("archived"),
      ).resolves.toBeUndefined();

      await waitFor(() =>
        expect(threads.getState().mainThreadId).toBe("archived"),
      );
      expect(threads.item("main").getState().status).toBe("archived");
      expect(threads.getState().archivedThreadIds).toContain("archived");
    } finally {
      handle.destroy();
    }
  });

  it("rejects explicit unarchive without changing the archived status", async () => {
    const { handle } = mountList(makeArchivedAdapter());
    try {
      const threads = handle.getClient().threads;
      await threads.getLoadThreadsPromise();
      const optimisticUpdate = vi.spyOn(
        OptimisticState.prototype,
        "optimisticUpdate",
      );

      try {
        await expect(
          threads.item({ id: "archived" }).unarchive(),
        ).rejects.toThrow(
          "Remote thread list adapter does not support unarchiving",
        );

        expect(optimisticUpdate).not.toHaveBeenCalled();
        expect(threads.item({ id: "archived" }).getState().status).toBe(
          "archived",
        );
        expect(threads.getState().archivedThreadIds).toContain("archived");
      } finally {
        optimisticUpdate.mockRestore();
      }
    } finally {
      handle.destroy();
    }
  });
});

const mountDeletableThread = async () => {
  const deleted = deferred<void>();
  const adapter = makeAdapter({
    list: vi.fn(async () => ({
      threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
    })),
    delete: vi.fn(() => deleted.promise),
  });
  const stores = vi.spyOn(OptimisticState.prototype, "optimisticUpdate");
  const { handle } = mountList(adapter);
  const aui = handle.getClient();
  await aui.threads.getLoadThreadsPromise();
  const store = stores.mock.contexts[0] as OptimisticState<RemoteThreadState>;
  stores.mockRestore();
  flushTapSync(() => aui.threads.switchToThread("t1"));
  await waitFor(() => {
    expect(aui.threads.getState().mainThreadId).toBe("t1");
  });
  const isDeletionCommitted = () =>
    getThreadData(store.baseValue, "t1") === undefined;
  return { adapter, aui, handle, deleted, isDeletionCommitted };
};

const openTitleStream = () => {
  let controller!: ReadableStreamDefaultController;
  const stream = new ReadableStream({
    start(c) {
      controller = c;
      c.enqueue({ type: "part-start", path: [0], part: { type: "text" } });
      c.enqueue({ type: "text-delta", path: [0], textDelta: "Generated" });
    },
  });
  return { stream, close: () => controller.close() };
};

const microtasks = async (count: number) => {
  for (let i = 0; i < count; i++) await Promise.resolve();
};

const mountControlledDraft = async (adapter: RemoteThreadListAdapter) => {
  const listeners = new Set<() => void>();
  const onThreadIdChange = vi.fn();
  const onSwitchToNewThread = vi.fn();
  const attachThread = deferred<void>();
  let threadId: string | undefined = "t0";
  const handle = createAssistantClient({
    getConfig: () =>
      AuiConfig({
        threads: RemoteThreadList({
          adapter,
          thread: (id) => StubThread({ threadId: id }) as never,
          threadId,
          onThreadIdChange,
          onSwitchToNewThread,
          __internal_ensureThread: (item) =>
            item.id === "t0" ? attachThread.promise : Promise.resolve(),
        }),
      }),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
  handle.subscribe(() => {});
  await handle.getClient().threads.getLoadThreadsPromise();
  const draftId = handle.getClient().threads.getState().newThreadId!;
  expect(handle.getClient().threads.getState().mainThreadId).toBe(draftId);
  threadId = undefined;
  flushTapSync(() => {
    for (const listener of listeners) listener();
  });
  return {
    handle,
    draftId,
    onThreadIdChange,
    onSwitchToNewThread,
    attachThread,
  };
};

const mountArchivedInitializingThread = async () => {
  const initialize = deferred<{
    remoteId: string;
    externalId: undefined;
  }>();
  const adapter = makeAdapter({
    list: vi.fn(async () => ({
      threads: [
        {
          status: "regular" as const,
          remoteId: "fallback",
          title: "Fallback",
        },
      ],
    })),
    initialize: vi.fn(() => initialize.promise),
  });
  const { handle } = mountList(adapter);
  const aui = handle.getClient();
  await aui.threads.getLoadThreadsPromise();
  const targetId = aui.threads.getState().mainThreadId;
  const initialization = aui.threads.item("main").initialize();
  await waitFor(() => {
    expect(handle.getClient().threads.item("main").getState().status).toBe(
      "regular",
    );
  });
  flushTapSync(() => aui.threads.switchToThread("fallback"));
  await waitFor(() => {
    expect(handle.getClient().threads.getState().mainThreadId).toBe("fallback");
  });
  flushTapSync(() => aui.threads.item({ id: targetId }).archive());
  await waitFor(() => {
    expect(handle.getClient().threads.getState().archivedThreadIds).toContain(
      targetId,
    );
  });
  return { adapter, handle, targetId, initialization, initialize };
};

describe("RemoteThreadList", () => {
  it.each([false, true])(
    "emits item switch events once to both scopes with backgroundThreads=%s",
    async (backgroundThreads) => {
      const adapter = makeAdapter({
        list: vi.fn(async () => ({
          threads: [
            { status: "regular" as const, remoteId: "A", title: "A" },
            { status: "regular" as const, remoteId: "B", title: "B" },
          ],
        })),
      });
      const handle = createAssistantClient(
        AuiConfig({
          threads: RemoteThreadList({
            adapter,
            backgroundThreads,
            thread: (threadId) => StubThread({ threadId }) as never,
          }),
        }),
      );
      const aui = handle.getClient();
      const starTo = vi.fn();
      const starAway = vi.fn();
      const itemTo = vi.fn();
      const itemAway = vi.fn();
      aui.on({ scope: "*", event: "threadListItem.switchedTo" }, starTo);
      aui.on({ scope: "*", event: "threadListItem.switchedAway" }, starAway);
      aui.on(
        { scope: "threadListItem", event: "threadListItem.switchedTo" },
        itemTo,
      );
      aui.on(
        { scope: "threadListItem", event: "threadListItem.switchedAway" },
        itemAway,
      );
      handle.subscribe(() => {});
      await aui.threads.getLoadThreadsPromise();
      expect(starTo).not.toHaveBeenCalled();
      expect(starAway).not.toHaveBeenCalled();
      expect(itemTo).not.toHaveBeenCalled();
      expect(itemAway).not.toHaveBeenCalled();

      flushTapSync(() => aui.threads.switchToThread("A"));
      await waitFor(() =>
        expect(aui.threads.getState().mainThreadId).toBe("A"),
      );
      starTo.mockClear();
      starAway.mockClear();
      itemTo.mockClear();
      itemAway.mockClear();
      flushTapSync(() => aui.threads.switchToThread("B"));
      await waitFor(() =>
        expect(aui.threads.getState().mainThreadId).toBe("B"),
      );
      expect(starAway).toHaveBeenCalledExactlyOnceWith({ threadId: "A" });
      expect(starTo).toHaveBeenCalledExactlyOnceWith({ threadId: "B" });
      expect(itemAway).not.toHaveBeenCalled();
      expect(itemTo).toHaveBeenCalledExactlyOnceWith({ threadId: "B" });

      starTo.mockClear();
      starAway.mockClear();
      itemTo.mockClear();
      flushTapSync(() => aui.threads.switchToNewThread());
      await waitFor(() =>
        expect(aui.threads.getState().mainThreadId).not.toBe("B"),
      );
      const newId = aui.threads.getState().mainThreadId;
      expect(starAway).toHaveBeenCalledExactlyOnceWith({ threadId: "B" });
      expect(starTo).toHaveBeenCalledExactlyOnceWith({ threadId: newId });
      expect(itemAway).not.toHaveBeenCalled();
      expect(itemTo).toHaveBeenCalledExactlyOnceWith({ threadId: newId });

      starTo.mockClear();
      starAway.mockClear();
      itemTo.mockClear();
      flushTapSync(() => aui.threads.switchToThread("fetched"));
      await waitFor(() =>
        expect(aui.threads.getState().mainThreadId).toBe("fetched"),
      );
      expect(adapter.fetch).toHaveBeenCalledWith("fetched");
      expect(starAway).toHaveBeenCalledExactlyOnceWith({ threadId: newId });
      expect(starTo).toHaveBeenCalledExactlyOnceWith({ threadId: "fetched" });
      expect(itemAway).not.toHaveBeenCalled();
      expect(itemTo).toHaveBeenCalledExactlyOnceWith({ threadId: "fetched" });
      handle.destroy();
    },
  );

  it.each([false, true])(
    "delivers thread-scoped composer.send events with backgroundThreads=%s",
    async (backgroundThreads) => {
      const onNew = vi.fn<(message: AppendMessage) => Promise<void>>(
        async () => {},
      );
      const adapter: ExternalStoreAdapter<{
        role: "user";
        text: string;
      }> = {
        messages: [],
        convertMessage: (message) => ({
          role: message.role,
          content: [{ type: "text", text: message.text }],
        }),
        onNew,
      };
      const runtime = new AssistantRuntimeImpl(
        new ExternalStoreRuntimeCore(adapter),
      );
      const handle = createAssistantClient(
        AuiConfig({
          threads: RemoteThreadList({
            adapter: makeAdapter(),
            backgroundThreads,
            thread: () =>
              ThreadClient({
                runtime: runtime.thread,
                threadListItem: runtime.threads.mainItem,
              }),
          }),
        }),
      );
      handle.subscribe(() => {});
      const aui = handle.getClient();
      const scoped = vi.fn();
      const global = vi.fn();
      aui.on({ scope: "thread", event: "composer.send" }, scoped);
      aui.on({ scope: "*", event: "composer.send" }, global);

      flushTapSync(() => aui.thread.append("hello"));
      await new Promise((resolve) => setTimeout(resolve));

      expect(onNew).toHaveBeenCalledTimes(1);
      expect(scoped).toHaveBeenCalledTimes(1);
      expect(global).toHaveBeenCalledTimes(1);
      handle.destroy();
    },
  );

  it("routes composer.send to the new main body after a switch", async () => {
    const emitters = new Map<string, () => void>();
    const useEmittingThread = ({ threadId }: { threadId: string }) => {
      const emit = useAssistantEmit();
      emitters.set(threadId, () =>
        emit("composer.send", {
          threadId,
          chars: 1,
          attachments: 0,
        }),
      );
      return useStubThread({ threadId });
    };
    const EmittingThread = resource(useEmittingThread);
    const handle = createAssistantClient(
      AuiConfig({
        threads: RemoteThreadList({
          adapter: makeAdapter({
            list: vi.fn(async () => ({
              threads: [
                { status: "regular" as const, remoteId: "t1", title: "One" },
              ],
            })),
          }),
          backgroundThreads: true,
          thread: (id) =>
            withKey(id, EmittingThread({ threadId: id }) as never),
        }),
      }),
    );
    handle.subscribe(() => {});
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    const previousId = aui.threads.getState().mainThreadId;
    expect(previousId).not.toBe("t1");
    const scoped = vi.fn();
    const global = vi.fn();
    aui.on({ scope: "thread", event: "composer.send" }, scoped);
    aui.on({ scope: "*", event: "composer.send" }, global);

    flushTapSync(() => aui.threads.switchToThread("t1"));
    await waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t1");
    });
    emitters.get("t1")!();
    await new Promise((resolve) => setTimeout(resolve));
    expect(scoped).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ threadId: "t1" }),
    );

    emitters.get(previousId)!();
    await new Promise((resolve) => setTimeout(resolve));
    expect(scoped).toHaveBeenCalledTimes(1);
    expect(global).toHaveBeenCalledTimes(2);
    handle.destroy();
  });

  it("loads adapter threads on a standalone client", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "regular" as const, remoteId: "t1", title: "One" },
          { status: "archived" as const, remoteId: "t2", title: "Two" },
        ],
      })),
    });
    const { handle } = mountList(adapter);
    await handle.getClient().threads.getLoadThreadsPromise();
    const state = handle.getClient().threads.getState();
    expect(state.threadIds).toEqual(["t1"]);
    expect(state.archivedThreadIds).toEqual(["t2"]);
    expect(state.isLoading).toBe(false);
    expect(adapter.list).toHaveBeenCalledOnce();
    expect(state.newThreadId).toMatch(/^__LOCALID_/);
    expect(state.mainThreadId).toBe(state.newThreadId);
    handle.destroy();
  });

  it("switches away when unarchiving the main thread fails", async () => {
    const error = new Error("unarchive failed");
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "archived" as const, remoteId: "t1", title: "One" },
        ],
      })),
      unarchive: vi.fn(async () => {
        throw error;
      }),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    await waitFor(() => {
      expect(aui.threads.getState().archivedThreadIds).toEqual(["t1"]);
    });

    flushTapSync(() =>
      aui.threads.item({ id: "t1" }).switchTo({ unarchive: false }),
    );
    await waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t1");
    });

    await expect(aui.threads.item({ id: "t1" }).unarchive()).rejects.toBe(
      error,
    );
    expect(aui.threads.item({ id: "t1" }).getState().status).toBe("archived");
    await waitFor(() => {
      expect(aui.threads.getState().mainThreadId).not.toBe("t1");
    });
    handle.destroy();
  });

  it("stays on an archived thread opened with unarchive: false when another thread is archived or deleted", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "archived" as const, remoteId: "t1" },
          { status: "regular" as const, remoteId: "t2" },
          { status: "regular" as const, remoteId: "t3" },
        ],
      })),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    await waitFor(() => {
      expect(aui.threads.getState().archivedThreadIds).toEqual(["t1"]);
    });
    flushTapSync(() =>
      aui.threads.item({ id: "t1" }).switchTo({ unarchive: false }),
    );
    await waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t1");
    });

    await aui.threads.item({ id: "t2" }).archive();
    await aui.threads.item({ id: "t3" }).delete();
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));

    expect(aui.threads.getState().mainThreadId).toBe("t1");
    handle.destroy();
  });

  it("moves off the main thread when a delete of its listed duplicate lands on it", async () => {
    const list = deferred<{ threads: RemoteThreadMetadata[] }>();
    const initialize = deferred<{ remoteId: string; externalId: undefined }>();
    const adapter = makeAdapter({
      list: vi.fn(() => list.promise),
      initialize: vi.fn(() => initialize.promise),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    const loading = aui.threads.getLoadThreadsPromise();
    const localId = aui.threads.getState().mainThreadId;
    const initialization = aui.threads.item("main").initialize();
    await waitFor(() => {
      expect(aui.threads.item("main").getState().status).toBe("regular");
    });

    list.resolve({ threads: [{ status: "regular", remoteId: "remote-1" }] });
    await loading;
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toContain("remote-1");
    });

    const deletion = aui.threads.item({ id: "remote-1" }).delete();
    initialize.resolve({ remoteId: "remote-1", externalId: undefined });
    await initialization;
    await deletion;

    expect(adapter.delete).toHaveBeenCalledWith("remote-1");
    await waitFor(() => {
      const state = aui.threads.getState();
      expect(state.mainThreadId).not.toBe(localId);
      expect(state.mainThreadId).toBe(state.newThreadId);
    });
    handle.destroy();
  });

  it("moves off the main thread when an archive of its listed duplicate settles before initialize", async () => {
    const list = deferred<{ threads: RemoteThreadMetadata[] }>();
    const initialize = deferred<{ remoteId: string; externalId: undefined }>();
    const adapter = makeAdapter({
      list: vi.fn(() => list.promise),
      initialize: vi.fn(() => initialize.promise),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    const loading = aui.threads.getLoadThreadsPromise();
    const localId = aui.threads.getState().mainThreadId;
    const initialization = aui.threads.item("main").initialize();
    await waitFor(() => {
      expect(aui.threads.item("main").getState().status).toBe("regular");
    });

    list.resolve({ threads: [{ status: "regular", remoteId: "remote-1" }] });
    await loading;
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toContain("remote-1");
    });
    await aui.threads.item({ id: "remote-1" }).archive();

    initialize.resolve({ remoteId: "remote-1", externalId: undefined });
    await initialization;

    expect(adapter.archive).toHaveBeenCalledWith("remote-1");
    await waitFor(() => {
      const state = aui.threads.getState();
      expect(state.mainThreadId).not.toBe(localId);
      expect(state.mainThreadId).toBe(state.newThreadId);
    });
    expect(aui.threads.getState().archivedThreadIds).toEqual([localId]);
    handle.destroy();
  });

  it("moves off the main thread when a delete of its listed duplicate settles before initialize", async () => {
    const list = deferred<{ threads: RemoteThreadMetadata[] }>();
    const initialize = deferred<{ remoteId: string; externalId: undefined }>();
    const adapter = makeAdapter({
      list: vi.fn(() => list.promise),
      initialize: vi.fn(() => initialize.promise),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    const loading = aui.threads.getLoadThreadsPromise();
    const localId = aui.threads.getState().mainThreadId;
    const initialization = aui.threads.item("main").initialize();
    await waitFor(() => {
      expect(aui.threads.item("main").getState().status).toBe("regular");
    });

    list.resolve({ threads: [{ status: "regular", remoteId: "remote-1" }] });
    await loading;
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toContain("remote-1");
    });
    await aui.threads.item({ id: "remote-1" }).delete();

    initialize.resolve({ remoteId: "remote-1", externalId: undefined });
    await initialization;

    expect(adapter.delete).toHaveBeenCalledWith("remote-1");
    await waitFor(() => {
      const state = aui.threads.getState();
      expect(state.mainThreadId).not.toBe(localId);
      expect(state.mainThreadId).toBe(state.newThreadId);
    });
    expect(aui.threads.getState().threadIds).not.toContain(localId);
    expect(() => aui.threads.item("main").getState()).not.toThrow();
    handle.destroy();
  });

  it("moves off a removed main thread while an unrelated switch is still loading", async () => {
    const list = deferred<{ threads: RemoteThreadMetadata[] }>();
    const initialize = deferred<{ remoteId: string; externalId: undefined }>();
    const fetch = deferred<RemoteThreadMetadata>();
    const adapter = makeAdapter({
      list: vi.fn(() => list.promise),
      initialize: vi.fn(() => initialize.promise),
      fetch: vi.fn(() => fetch.promise),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    const loading = aui.threads.getLoadThreadsPromise();
    const initialization = aui.threads.item("main").initialize();
    await waitFor(() => {
      expect(aui.threads.item("main").getState().status).toBe("regular");
    });
    // a deep link to a thread the list doesn't have yet: its fetch hangs
    aui.threads.switchToThread("remote-9");

    list.resolve({ threads: [{ status: "regular", remoteId: "remote-1" }] });
    await loading;
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toContain("remote-1");
    });

    const deletion = aui.threads.item({ id: "remote-1" }).delete();
    initialize.resolve({ remoteId: "remote-1", externalId: undefined });
    await initialization;
    await deletion;
    await waitFor(() => {
      const state = aui.threads.getState();
      expect(state.mainThreadId).toBe(state.newThreadId);
    });

    // while remote-9 is still loading, the main thread must resolve
    expect(() => aui.threads.item("main").getState()).not.toThrow();
    fetch.resolve({ status: "regular", remoteId: "remote-9" });
    await waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("remote-9");
    });
    handle.destroy();
  });

  it("restores an initialized draft's archived thread when unarchive fails", async () => {
    const error = new Error("unarchive failed");
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "archived" as const, remoteId: "t1", title: "One" },
        ],
      })),
      unarchive: vi.fn(async () => {
        throw error;
      }),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    await waitFor(() => {
      expect(aui.threads.getState().archivedThreadIds).toContain("t1");
    });
    await aui.threads.item("main").initialize();

    flushTapSync(() =>
      aui.threads.item({ id: "t1" }).switchTo({ unarchive: false }),
    );
    await waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t1");
    });

    await expect(aui.threads.item({ id: "t1" }).unarchive()).rejects.toBe(
      error,
    );
    await waitFor(() => {
      expect(aui.threads.getState().mainThreadId).not.toBe("t1");
    });
    expect(aui.threads.item({ id: "t1" }).getState().status).toBe("archived");
    expect(aui.threads.getState().archivedThreadIds).toContain("t1");
    expect(aui.threads.getState().threadIds).not.toContain("t1");
    handle.destroy();
  });

  it("keeps a thread initialized during the list() flight after switching away", async () => {
    const listDeferred =
      deferred<Awaited<ReturnType<RemoteThreadListAdapter["list"]>>>();
    const adapter = makeAdapter({
      list: vi.fn(() => listDeferred.promise),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();

    const loadPromise = aui.threads.getLoadThreadsPromise();
    const initializedId = aui.threads.getState().mainThreadId;
    await aui.threads.item("main").initialize();
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toContain(initializedId);
    });

    listDeferred.resolve({
      threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
    });
    await loadPromise;

    flushTapSync(() => aui.threads.switchToNewThread());
    await waitFor(() => {
      expect(aui.threads.getState().mainThreadId).not.toBe(initializedId);
    });

    expect(aui.threads.getState().threadIds[0]).toBe(initializedId);
    expect(aui.threads.getState().threadIds).toContain("t1");
    handle.destroy();
  });

  it("switches to a listed thread and back to a new thread", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();

    flushTapSync(() => aui.threads.switchToThread("t1"));
    await waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe("t1");
    });

    flushTapSync(() => handle.getClient().threads.switchToNewThread());
    const afterNew = handle.getClient().threads.getState();
    expect(afterNew.mainThreadId).toBe(afterNew.newThreadId);
    expect(afterNew.threadIds).toContain("t1");
    handle.destroy();
  });

  it("initializes a new thread through the adapter", async () => {
    const adapter = makeAdapter();
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    const localId = aui.threads.getState().mainThreadId;

    const result = await aui.threads.item("main").initialize();
    expect(adapter.initialize).toHaveBeenCalledWith(localId);
    expect(result.remoteId).toBe(`remote-${localId}`);
    await waitFor(() => {
      const state = handle.getClient().threads.getState();
      expect(state.threadIds).toContain(localId);
      expect(state.newThreadId).toBeNull();
      expect(handle.getClient().threads.item("main").getState().remoteId).toBe(
        `remote-${localId}`,
      );
    });
    handle.destroy();
  });

  it("fetches an unknown thread id on switch", async () => {
    const adapter = makeAdapter();
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();

    flushTapSync(() => aui.threads.switchToThread("missing"));
    await waitFor(() => {
      expect(adapter.fetch).toHaveBeenCalledWith("missing");
      expect(handle.getClient().threads.getState().mainThreadId).toBe(
        "missing",
      );
      expect(handle.getClient().threads.getState().threadIds).toContain(
        "missing",
      );
    });
    handle.destroy();
  });

  it("rolls back an archive that fails after a fetched thread was merged", async () => {
    const archive = deferred<void>();
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1" }],
      })),
      archive: vi.fn(() => archive.promise),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual(["t1"]);
    });

    const archiving = aui.threads.item({ id: "t1" }).archive();
    await waitFor(() => {
      expect(aui.threads.getState().archivedThreadIds).toEqual(["t1"]);
    });
    flushTapSync(() => aui.threads.switchToThread("t2"));
    await waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t2");
    });

    archive.reject(new Error("archive failed"));
    await expect(archiving).rejects.toThrow("archive failed");
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual(["t1", "t2"]);
      expect(aui.threads.getState().archivedThreadIds).toEqual([]);
    });
    handle.destroy();
  });

  it("notifies once when the fetched thread becomes visible", async () => {
    const fetch = deferred<RemoteThreadMetadata>();
    const adapter = makeAdapter({ fetch: vi.fn(() => fetch.promise) });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    const listener = vi.fn();
    handle.subscribe(listener);

    flushTapSync(() => aui.threads.switchToThread("t2"));
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(0);

    fetch.resolve({ status: "regular", remoteId: "t2", title: "T2" });
    await waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t2");
    });
    expect(listener).toHaveBeenCalledTimes(1);
    handle.destroy();
  });

  it("merges a fetched thread into the slot that initialized under its remote id", async () => {
    const initialize = deferred<{ remoteId: string; externalId: undefined }>();
    const fetch = deferred<RemoteThreadMetadata>();
    const adapter = makeAdapter({
      initialize: vi.fn(() => initialize.promise),
      fetch: vi.fn(() => fetch.promise),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    const localId = aui.threads.getState().mainThreadId;
    const initialization = aui.threads.item("main").initialize();
    await waitFor(() => {
      expect(aui.threads.item("main").getState().status).toBe("regular");
    });
    flushTapSync(() => aui.threads.switchToThread("remote-1"));

    initialize.resolve({ remoteId: "remote-1", externalId: undefined });
    await initialization;
    fetch.resolve({
      status: "regular",
      remoteId: "remote-1",
      title: "Fetched",
    });

    await waitFor(() => {
      expect(aui.threads.item({ id: "remote-1" }).getState().title).toBe(
        "Fetched",
      );
    });
    const state = aui.threads.getState();
    expect(state.threadIds).toEqual([localId]);
    expect(state.mainThreadId).toBe(localId);
    handle.destroy();
  });

  it("renames and deletes through the adapter", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    await waitFor(() => {
      expect(handle.getClient().threads.getState().threadIds).toEqual(["t1"]);
    });

    flushTapSync(() =>
      handle.getClient().threads.item({ id: "t1" }).rename("Renamed"),
    );
    await waitFor(() => {
      expect(adapter.rename).toHaveBeenCalledWith("t1", "Renamed");
      expect(
        handle.getClient().threads.item({ id: "t1" }).getState().title,
      ).toBe("Renamed");
    });

    const draftId = handle.getClient().threads.getState().mainThreadId;
    flushTapSync(() => handle.getClient().threads.item({ id: "t1" }).delete());
    await waitFor(() => {
      expect(adapter.delete).toHaveBeenCalledWith("t1");
      expect(handle.getClient().threads.getState().threadIds).not.toContain(
        "t1",
      );
      expect(handle.getClient().threads.getState().mainThreadId).toBe(draftId);
    });
    handle.destroy();
  });

  it("rejects actions but initializes a mounted thread after reload unlists it", async () => {
    let lists = 0;
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "regular" as const, remoteId: "t1", title: "One" },
          ...(lists++ === 0
            ? [{ status: "regular" as const, remoteId: "t2", title: "Two" }]
            : []),
        ],
      })),
      updateCustom: vi.fn(async () => {}),
    });
    const stores = vi.spyOn(OptimisticState.prototype, "optimisticUpdate");
    const handle = createAssistantClient(
      AuiConfig({
        threads: RemoteThreadList({
          adapter,
          backgroundThreads: true,
          thread: (id) => StubThread({ threadId: id }) as never,
        }),
      }),
    );
    handle.subscribe(() => {});
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    const store = stores.mock.contexts[0] as OptimisticState<RemoteThreadState>;
    stores.mockRestore();
    const item = aui.threads.item({ id: "t2" });

    flushTapSync(() => aui.threads.switchToThread("t2"));
    await waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t2");
    });
    flushTapSync(() => aui.threads.switchToThread("t1"));
    await waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t1");
    });

    await aui.threads.reload();
    expect(aui.threads.getState().threadIds).toEqual(["t1"]);
    expect(getThreadData(store.baseValue, "t2")?.id).toBe("t2");

    await expect(item.rename("Hidden")).rejects.toThrow(
      'Thread "t2" was not found while renaming it.',
    );
    await expect(item.updateCustom({ hidden: true })).rejects.toThrow(
      'Thread "t2" was not found while updating its custom metadata.',
    );
    await expect(item.archive()).rejects.toThrow(
      'Thread "t2" was not found while archiving it.',
    );
    await expect(item.delete()).rejects.toThrow(
      'Thread "t2" was not found while deleting it.',
    );
    await expect(item.initialize()).resolves.toEqual({
      remoteId: "t2",
      externalId: undefined,
    });
    expect(adapter.initialize).not.toHaveBeenCalled();
    expect(adapter.rename).not.toHaveBeenCalled();
    expect(adapter.updateCustom).not.toHaveBeenCalled();
    expect(adapter.archive).not.toHaveBeenCalled();
    expect(adapter.delete).not.toHaveBeenCalled();

    flushTapSync(() => aui.threads.switchToThread("t2"));
    await waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t2");
    });
    expect(aui.threads.getState().threadIds).toEqual(["t1"]);
    expect(aui.threads.item("main").getState().title).toBe("Two");
    await item.rename("Opened");
    expect(adapter.rename).toHaveBeenCalledWith("t2", "Opened");
    expect(adapter.fetch).not.toHaveBeenCalled();
    handle.destroy();
  });

  it("rejects unarchive on a captured archived item after reload hides it", async () => {
    let lists = 0;
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "regular" as const, remoteId: "t1", title: "One" },
          ...(lists++ === 0
            ? [{ status: "archived" as const, remoteId: "t2", title: "Two" }]
            : []),
        ],
      })),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    const item = aui.threads.item({ id: "t2" });

    await aui.threads.reload();
    expect(aui.threads.getState().archivedThreadIds).toEqual([]);
    await expect(item.unarchive()).rejects.toThrow(
      'Thread "t2" was not found while unarchiving it.',
    );
    expect(adapter.unarchive).not.toHaveBeenCalled();
    handle.destroy();
  });

  it("clears the deleted thread's title state so a reborn slot can auto-title", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "regular" as const, remoteId: "t1", title: "One" },
          { status: "regular" as const, remoteId: "t2", title: "Two" },
        ],
      })),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual(["t1", "t2"]);
    });

    await aui.threads.item({ id: "t1" }).rename("Manual title");
    await aui.threads.item({ id: "t2" }).rename("Kept manual title");
    await aui.threads.item({ id: "t1" }).delete();
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual(["t2"]);
    });

    // The server still lists t1, so a reload rebirths the slot under the same
    // remote id; a leaked manual-rename entry would suppress its auto-title.
    await aui.threads.reload();
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual(["t1", "t2"]);
    });
    flushTapSync(() => aui.threads.switchToThread("t1"));
    await waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t1");
    });

    await aui.threads.item({ id: "t1" }).generateTitle({ automatic: true });
    expect(adapter.generateTitle).toHaveBeenCalledOnce();

    // t2 is the control: a reload that cleared every title state would
    // generate here as well.
    flushTapSync(() => aui.threads.switchToThread("t2"));
    await waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t2");
    });
    await aui.threads.item({ id: "t2" }).generateTitle({ automatic: true });
    expect(adapter.generateTitle).toHaveBeenCalledOnce();
    handle.destroy();
  });

  it("keeps a deleted thread absent and clears its title state when reload starts during deletion notification", async () => {
    const deletion = deferred<void>();
    let deletionReleased = false;
    let reloadStarted = false;
    let reload: (() => void) | undefined;
    let reloadTask: Promise<void> | undefined;
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "regular" as const, remoteId: "t1", title: "One" },
          { status: "regular" as const, remoteId: "t2", title: "Two" },
        ],
      })),
      delete: vi.fn(() => deletion.promise),
    });
    const originalNotify = (
      OptimisticState.prototype as unknown as {
        _notifySubscribers: () => void;
      }
    )._notifySubscribers;
    const notifySpy = vi
      .spyOn(
        OptimisticState.prototype as unknown as {
          _notifySubscribers: () => void;
        },
        "_notifySubscribers",
      )
      .mockImplementation(function (this: OptimisticState<unknown>) {
        originalNotify.call(this);
        const state = this.value as { threadIds?: readonly string[] };
        if (
          deletionReleased &&
          !reloadStarted &&
          state.threadIds !== undefined &&
          !state.threadIds.includes("t1")
        ) {
          reloadStarted = true;
          reload?.();
        }
      });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    reload = () => {
      reloadTask = aui.threads.reload();
    };
    await aui.threads.getLoadThreadsPromise();
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual(["t1", "t2"]);
    });

    await aui.threads.item({ id: "t1" }).rename("Manual title");
    expect(adapter.rename).toHaveBeenCalledWith("t1", "Manual title");

    try {
      flushTapSync(() => aui.threads.item({ id: "t1" }).delete());
      await waitFor(() => expect(adapter.delete).toHaveBeenCalledOnce());
      deletionReleased = true;
      deletion.resolve();

      await waitFor(() => expect(reloadStarted).toBe(true));
      await reloadTask;
      expect(aui.threads.getState().threadIds).toEqual(["t2"]);
      await aui.threads.reload();
      expect(aui.threads.getState().threadIds).toEqual(["t1", "t2"]);
      flushTapSync(() => aui.threads.switchToThread("t1"));
      await waitFor(() => {
        expect(aui.threads.getState().mainThreadId).toBe("t1");
      });
      await aui.threads.item({ id: "t1" }).generateTitle({ automatic: true });
      expect(adapter.generateTitle).toHaveBeenCalledOnce();
    } finally {
      notifySpy.mockRestore();
      handle.destroy();
    }
  });

  it("preserves an existing title when generation returns no title", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual(["t1"]);
    });
    flushTapSync(() => aui.threads.switchToThread("t1"));
    await waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t1");
    });

    await aui.threads.item({ id: "t1" }).generateTitle();
    // The list item re-renders a tick after the generation resolves, so an
    // erasing title write lands only once that render has run.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(adapter.generateTitle).toHaveBeenCalledOnce();
    expect(aui.threads.item({ id: "t1" }).getState().title).toBe("One");
    handle.destroy();
  });

  it("keeps a manual rename made during automatic title generation", async () => {
    const generatedTitle = deferred<ReadableStream>();
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
      generateTitle: vi.fn(async () => generatedTitle.promise as never),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual(["t1"]);
    });
    flushTapSync(() => aui.threads.switchToThread("t1"));
    await waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t1");
    });

    const generation = aui.threads
      .item({ id: "t1" })
      .generateTitle({ automatic: true });
    await waitFor(() => {
      expect(adapter.generateTitle).toHaveBeenCalledOnce();
    });
    await aui.threads.item({ id: "t1" }).rename("Manual title");
    await waitFor(() => {
      expect(aui.threads.item({ id: "t1" }).getState().title).toBe(
        "Manual title",
      );
    });

    generatedTitle.resolve(
      new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: "part-start",
            path: [0],
            part: { type: "text" },
          });
          controller.enqueue({
            type: "text-delta",
            path: [0],
            textDelta: "Generated title",
          });
          controller.enqueue({ type: "part-finish", path: [0] });
          controller.close();
        },
      }),
    );
    await generation;

    expect(aui.threads.item({ id: "t1" }).getState().title).toBe(
      "Manual title",
    );
    expect(adapter.rename).toHaveBeenNthCalledWith(1, "t1", "Manual title");
    expect(adapter.rename).toHaveBeenNthCalledWith(2, "t1", "Manual title");
    handle.destroy();
  });

  it("preserves a successful rename when an older explicit write lands late", async () => {
    let serverTitle = "One";
    const firstGeneratedTitle = deferred<ReadableStream>();
    const secondGeneratedTitle = deferred<ReadableStream>();
    const generatedTitles = [firstGeneratedTitle, secondGeneratedTitle];
    const renameWrites: ReturnType<typeof deferred<void>>[] = [];
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "regular" as const, remoteId: "t1", title: serverTitle },
        ],
      })),
      generateTitle: vi.fn(() => generatedTitles.shift()!.promise as never),
      rename: vi.fn((_remoteId: string, title: string) => {
        const write = deferred<void>();
        renameWrites.push(write);
        if (renameWrites.length === 3) {
          serverTitle = title;
          write.resolve();
        }
        return write.promise;
      }),
    });
    const { handle } = mountListWithTitleMessage(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    await waitFor(() =>
      expect(aui.threads.getState().threadIds).toEqual(["t1"]),
    );
    flushTapSync(() => aui.threads.switchToThread("t1"));
    await waitFor(() => expect(aui.threads.getState().mainThreadId).toBe("t1"));

    const item = aui.threads.item({ id: "t1" });
    item.generateTitle();
    await waitFor(() => expect(adapter.generateTitle).toHaveBeenCalledOnce());
    item.rename("Rename 1");
    item.rename("Rename 2");
    await waitFor(() => expect(adapter.rename).toHaveBeenCalledOnce());
    serverTitle = "Rename 1";
    renameWrites[0]!.resolve();
    await waitFor(() => expect(adapter.rename).toHaveBeenCalledTimes(2));
    renameWrites[1]!.reject(new Error("rename failed"));
    await microtasks(5);

    serverTitle = "G1ab";
    let controller!: ReadableStreamDefaultController<unknown>;
    firstGeneratedTitle.resolve(
      new ReadableStream({ start: (value) => void (controller = value) }),
    );
    await microtasks(5);
    item.generateTitle();
    await waitFor(() => expect(adapter.generateTitle).toHaveBeenCalledTimes(2));
    controller.enqueue({
      type: "part-start",
      path: [0],
      part: { type: "text" },
    });
    controller.enqueue({ type: "text-delta", path: [0], textDelta: "G1ab" });
    controller.enqueue({ type: "part-finish", path: [0] });
    await waitFor(() => expect(controller.desiredSize).toBeGreaterThan(0));
    await microtasks(20);
    secondGeneratedTitle.reject(new Error("generate failed"));
    await microtasks(5);
    controller.close();
    await waitFor(() => expect(adapter.rename).toHaveBeenCalledTimes(3));
    expect(adapter.rename).toHaveBeenNthCalledWith(3, "t1", "Rename 1");
    await waitFor(() => expect(serverTitle).toBe("Rename 1"));
    await waitFor(() => expect(item.getState().title).toBe("Rename 1"));
    handle.destroy();
  });

  it("stops title requests for a thread once its deletion completes", async () => {
    const generatedTitle = deferred<ReadableStream>();
    let stream!: ReadableStreamDefaultController;
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
      generateTitle: vi.fn(async () => generatedTitle.promise as never),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual(["t1"]);
    });
    flushTapSync(() => aui.threads.switchToThread("t1"));
    await waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t1");
    });

    const generation = aui.threads
      .item({ id: "t1" })
      .generateTitle({ automatic: true });
    await waitFor(() => {
      expect(adapter.generateTitle).toHaveBeenCalledOnce();
    });
    generatedTitle.resolve(
      new ReadableStream({
        start(controller) {
          stream = controller;
          controller.enqueue({
            type: "part-start",
            path: [0],
            part: { type: "text" },
          });
          controller.enqueue({
            type: "text-delta",
            path: [0],
            textDelta: "Generated title",
          });
        },
      }),
    );
    await aui.threads.item({ id: "t1" }).rename("Manual title");
    await aui.threads.item({ id: "t1" }).delete();
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual([]);
    });

    stream.close();
    await generation;

    expect(adapter.rename).toHaveBeenCalledOnce();
    handle.destroy();
  });

  it("stops a deleted thread's title run after a reload lists the same id again", async () => {
    const generatedTitle = deferred<ReadableStream>();
    let stream!: ReadableStreamDefaultController;
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
      generateTitle: vi.fn(async () => generatedTitle.promise as never),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual(["t1"]);
    });
    flushTapSync(() => aui.threads.switchToThread("t1"));
    await waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t1");
    });

    const generation = aui.threads
      .item({ id: "t1" })
      .generateTitle({ automatic: true });
    await waitFor(() => {
      expect(adapter.generateTitle).toHaveBeenCalledOnce();
    });
    generatedTitle.resolve(
      new ReadableStream({
        start(controller) {
          stream = controller;
          controller.enqueue({
            type: "part-start",
            path: [0],
            part: { type: "text" },
          });
          controller.enqueue({
            type: "text-delta",
            path: [0],
            textDelta: "Generated title",
          });
        },
      }),
    );
    await aui.threads.item({ id: "t1" }).rename("Manual title");
    await aui.threads.item({ id: "t1" }).delete();
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual([]);
    });
    await aui.threads.reload();
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual(["t1"]);
    });

    stream.close();
    await generation;

    expect(adapter.rename).toHaveBeenCalledOnce();
    expect(aui.threads.item({ id: "t1" }).getState().title).toBe("One");
    handle.destroy();
  });

  // A deletion commits a few microtasks before its title state is cleared, so
  // these settle the deletion at every offset across that window.
  it("does not request a title between a deletion committing and its title state clearing", async () => {
    const late: number[] = [];
    for (let offset = 0; offset < 20; offset++) {
      const { adapter, aui, handle, deleted, isDeletionCommitted } =
        await mountDeletableThread();
      const renamed = deferred<void>();
      let renameSettled = false;
      vi.mocked(adapter.rename).mockImplementation(async () => {
        await renamed.promise;
        renameSettled = true;
      });
      vi.mocked(adapter.delete).mockImplementation(() => {
        expect(renameSettled).toBe(true);
        return deleted.promise;
      });
      vi.mocked(adapter.generateTitle).mockImplementation(async () => {
        if (isDeletionCommitted()) late.push(offset);
        return new ReadableStream({
          start(controller) {
            controller.close();
          },
        }) as never;
      });

      const renaming = aui.threads.item({ id: "t1" }).rename("Manual title");
      const generation = aui.threads.item({ id: "t1" }).generateTitle();
      const deleting = aui.threads.item({ id: "t1" }).delete();
      expect(adapter.delete).not.toHaveBeenCalled();
      renamed.resolve();
      await vi.waitFor(
        () => {
          expect(adapter.delete).toHaveBeenCalledOnce();
        },
        { interval: 5 },
      );
      await microtasks(offset);
      deleted.resolve();
      await Promise.all([renaming, generation, deleting]);
      handle.destroy();
    }

    expect(late).toEqual([]);
  });

  it("does not write a rename back between a deletion committing and its title state clearing", async () => {
    const late: number[] = [];
    for (let offset = 0; offset < 20; offset++) {
      const { adapter, aui, handle, deleted, isDeletionCommitted } =
        await mountDeletableThread();
      const generatedTitle = openTitleStream();
      vi.mocked(adapter.generateTitle).mockResolvedValue(
        generatedTitle.stream as never,
      );
      vi.mocked(adapter.rename).mockImplementation(async () => {
        if (isDeletionCommitted()) late.push(offset);
      });

      const generation = aui.threads
        .item({ id: "t1" })
        .generateTitle({ automatic: true });
      await vi.waitFor(
        () => {
          expect(adapter.generateTitle).toHaveBeenCalledOnce();
        },
        { interval: 5 },
      );
      await aui.threads.item({ id: "t1" }).rename("Manual title");
      const deleting = aui.threads.item({ id: "t1" }).delete();
      await vi.waitFor(
        () => {
          expect(adapter.delete).toHaveBeenCalledOnce();
        },
        { interval: 5 },
      );
      generatedTitle.close();
      await microtasks(offset);
      deleted.resolve();
      await Promise.all([generation, deleting]);
      handle.destroy();
    }

    expect(late).toEqual([]);
  });

  it("does not request a title for a thread deleted while the request waits on a rename", async () => {
    const renamed = deferred<void>();
    let renameSettled = false;
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
      rename: vi.fn(async () => {
        await renamed.promise;
        renameSettled = true;
      }),
      delete: vi.fn(async () => {
        expect(renameSettled).toBe(true);
      }),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual(["t1"]);
    });
    flushTapSync(() => aui.threads.switchToThread("t1"));
    await waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t1");
    });

    const renaming = aui.threads.item({ id: "t1" }).rename("Manual title");
    const generation = aui.threads
      .item({ id: "t1" })
      .generateTitle({ automatic: true });
    const deleting = aui.threads.item({ id: "t1" }).delete();
    expect(adapter.delete).not.toHaveBeenCalled();
    renamed.resolve();
    await deleting;
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual([]);
    });
    await renaming;
    await generation;

    expect(adapter.generateTitle).not.toHaveBeenCalled();
    handle.destroy();
  });

  it("preserves generated titles across an overlapping reload", async () => {
    const reload = deferred<{
      threads: {
        status: "regular";
        remoteId: string;
        title: string;
      }[];
    }>();
    const adapter = makeAdapter({
      list: vi
        .fn()
        .mockResolvedValueOnce({
          threads: [
            { status: "regular" as const, remoteId: "t1", title: "One" },
          ],
        })
        .mockImplementationOnce(() => reload.promise),
      generateTitle: vi.fn(
        async () =>
          new ReadableStream({
            start(controller) {
              controller.enqueue({
                type: "part-start",
                path: [],
                part: { type: "text" },
              });
              controller.enqueue({
                type: "text-delta",
                path: [0],
                textDelta: "Generated",
              });
              controller.enqueue({ type: "part-finish", path: [0] });
              controller.close();
            },
          }) as never,
      ),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    flushTapSync(() => aui.threads.switchToThread("t1"));
    await waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t1");
    });

    const reloadPromise = aui.threads.reload();
    await waitFor(() => {
      expect(adapter.list).toHaveBeenCalledTimes(2);
    });
    await aui.threads.item({ id: "t1" }).rename("Renamed");
    await aui.threads.item({ id: "t1" }).generateTitle();
    await waitFor(() => {
      expect(aui.threads.item({ id: "t1" }).getState().title).toBe("Generated");
    });

    reload.resolve({
      threads: [{ status: "regular", remoteId: "t1", title: "One" }],
    });
    await reloadPromise;
    await waitFor(() => {
      expect(aui.threads.item({ id: "t1" }).getState().title).toBe("Generated");
    });
    handle.destroy();
  });

  it("clears loading when a reload supersedes a hung list", async () => {
    const adapter = makeAdapter({
      list: vi
        .fn()
        .mockImplementationOnce(() => new Promise<never>(() => {}))
        .mockResolvedValueOnce({
          threads: [
            { status: "regular" as const, remoteId: "fresh", title: "Fresh" },
          ],
        }),
    });
    const { handle } = mountList(adapter);
    const threads = handle.getClient().threads;

    void threads.getLoadThreadsPromise();
    await threads.reload();

    await waitFor(() => {
      const state = handle.getClient().threads.getState();
      expect(state.threadIds).toEqual(["fresh"]);
      expect(state.isLoading).toBe(false);
    });
    handle.destroy();
  });

  it("clears loadingMore when a reload supersedes a hung loadMore", async () => {
    const adapter = makeAdapter({
      list: vi
        .fn()
        .mockResolvedValueOnce({
          threads: [
            { status: "regular" as const, remoteId: "t1", title: "One" },
          ],
          nextCursor: "c1",
        })
        .mockImplementationOnce(() => new Promise<never>(() => {}))
        .mockResolvedValueOnce({
          threads: [
            { status: "regular" as const, remoteId: "fresh", title: "Fresh" },
          ],
        }),
    });
    const { handle } = mountList(adapter);
    const threads = handle.getClient().threads;

    await threads.getLoadThreadsPromise();
    void threads.loadMore();
    await threads.reload();

    await waitFor(() => {
      const state = handle.getClient().threads.getState();
      expect(state.threadIds).toEqual(["fresh"]);
      expect(state.isLoadingMore).toBe(false);
    });
    handle.destroy();
  });

  it("opens a controlled threadId without echoing it back", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
    });
    const { handle, onThreadIdChange } = mountList(adapter, "t1");
    await handle.getClient().threads.getLoadThreadsPromise();
    await waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe("t1");
    });
    expect(onThreadIdChange).not.toHaveBeenCalled();
    handle.destroy();
  });

  it.each(["before", "after"] as const)(
    "opens a fresh draft when initialization starts %s a controlled new-thread request",
    async (initializationStart) => {
      const attachThread = deferred<void>();
      const initialization = deferred<{
        remoteId: string;
        externalId: undefined;
      }>();
      const adapter = makeAdapter({
        list: vi.fn(async () => ({
          threads: [
            { status: "regular" as const, remoteId: "t0", title: "Zero" },
          ],
        })),
        initialize: vi.fn(() => initialization.promise),
      });
      const listeners = new Set<() => void>();
      const onThreadIdChange = vi.fn();
      let threadId: string | undefined = "t0";
      const ensureThread = vi.fn((item: { id: string }) =>
        item.id === "t0" ? attachThread.promise : Promise.resolve(),
      );
      const source: AssistantConfigSource = {
        getConfig: () =>
          AuiConfig({
            threads: RemoteThreadList({
              adapter,
              thread: (id) => StubThread({ threadId: id }) as never,
              threadId,
              onThreadIdChange,
              __internal_ensureThread: ensureThread,
            }),
          }),
        subscribe: (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      };
      const handle = createAssistantClient(source);
      handle.subscribe(() => {});
      await waitFor(() => {
        expect(ensureThread).toHaveBeenCalledWith(
          expect.objectContaining({ id: "t0" }),
        );
      });
      const draftId = handle.getClient().threads.getState().newThreadId;
      expect(draftId).toBeDefined();
      expect(handle.getClient().threads.getState().mainThreadId).toBe(draftId);

      const initializing =
        initializationStart === "before"
          ? handle.getClient().threads.item({ id: draftId! }).initialize()
          : undefined;
      threadId = undefined;
      flushTapSync(() => {
        for (const listener of listeners) listener();
      });
      const pending =
        initializing ??
        handle.getClient().threads.item({ id: draftId! }).initialize();
      initialization.resolve({ remoteId: "t1", externalId: undefined });
      await pending;
      attachThread.resolve();

      await waitFor(() => {
        const threads = handle.getClient().threads;
        const main = threads.item("main").getState();
        expect(main.id).not.toBe(draftId);
        expect(main.status).toBe("new");
        expect(main.remoteId).toBeUndefined();
        expect(threads.getState().threadIds).toContain(draftId);
        expect(threads.item({ id: draftId! }).getState().remoteId).toBe("t1");
      });
      expect(onThreadIdChange).not.toHaveBeenCalledWith("t1");
      handle.destroy();
    },
  );

  it("keeps a restarted controlled new-thread request controlled while its fresh draft attaches", async () => {
    const attachThread = deferred<void>();
    const attachFresh = deferred<void>();
    const initialization = deferred<{
      remoteId: string;
      externalId: undefined;
    }>();
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "regular" as const, remoteId: "t0", title: "Zero" },
        ],
      })),
      initialize: vi.fn(() => initialization.promise),
    });
    const listeners = new Set<() => void>();
    const onThreadIdChange = vi.fn();
    let threadId: string | undefined = "t0";
    let draftId: string | undefined;
    const ensureThread = vi.fn((item: { id: string }) => {
      if (item.id === "t0") return attachThread.promise;
      if (item.id === draftId) return Promise.resolve();
      return attachFresh.promise;
    });
    const source: AssistantConfigSource = {
      getConfig: () =>
        AuiConfig({
          threads: RemoteThreadList({
            adapter,
            thread: (id) => StubThread({ threadId: id }) as never,
            threadId,
            onThreadIdChange,
            __internal_ensureThread: ensureThread,
          }),
        }),
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
    const handle = createAssistantClient(source);
    handle.subscribe(() => {});
    await waitFor(() => {
      expect(ensureThread).toHaveBeenCalledWith(
        expect.objectContaining({ id: "t0" }),
      );
    });
    draftId = handle.getClient().threads.getState().newThreadId ?? undefined;
    threadId = undefined;
    flushTapSync(() => {
      for (const listener of listeners) listener();
    });
    const initializing = handle
      .getClient()
      .threads.item({ id: draftId! })
      .initialize();
    initialization.resolve({ remoteId: "t1", externalId: undefined });
    await initializing;
    attachThread.resolve();
    await waitFor(() => {
      expect(ensureThread).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.not.stringMatching(new RegExp(`^(t0|${draftId})$`)),
        }),
      );
    });

    void handle.getClient().threads.__internal_getRawActions!().switchToThread(
      draftId!,
    );
    attachFresh.resolve();

    await waitFor(() => {
      const main = handle.getClient().threads.item("main").getState();
      expect(main.id).not.toBe(draftId);
      expect(main.status).toBe("new");
    });
    expect(onThreadIdChange).not.toHaveBeenCalledWith("t1");
    handle.destroy();
  });

  it("reports an ordinary initialization after a controlled switch settles", async () => {
    const adapter = makeAdapter();
    const { handle, draftId, onThreadIdChange } =
      await mountControlledDraft(adapter);
    await microtasks(5);

    await handle.getClient().threads.item({ id: draftId }).initialize();
    expect(onThreadIdChange).toHaveBeenCalledWith(`remote-${draftId}`);
    expect(handle.getClient().threads.getState().mainThreadId).toBe(draftId);
    handle.destroy();
  });

  it("treats a retry after initialization rejection as an ordinary message", async () => {
    const adapter = makeAdapter({
      initialize: vi
        .fn()
        .mockRejectedValueOnce(new Error("failed"))
        .mockResolvedValueOnce({ remoteId: "t1", externalId: undefined }),
    });
    const { handle, draftId, onThreadIdChange } =
      await mountControlledDraft(adapter);
    await microtasks(5);

    await expect(
      handle.getClient().threads.item({ id: draftId }).initialize(),
    ).rejects.toThrow("failed");
    await handle.getClient().threads.item({ id: draftId }).initialize();
    expect(onThreadIdChange).toHaveBeenCalledWith("t1");
    expect(handle.getClient().threads.getState().mainThreadId).toBe(draftId);
    handle.destroy();
  });

  it("does not start a switch when initialization resolves after destruction", async () => {
    const initialization = deferred<{
      remoteId: string;
      externalId: undefined;
    }>();
    const adapter = makeAdapter({
      initialize: vi.fn(() => initialization.promise),
    });
    const { handle, draftId, onSwitchToNewThread } =
      await mountControlledDraft(adapter);
    const pending = handle
      .getClient()
      .threads.item({ id: draftId })
      .initialize();
    handle.destroy();
    initialization.resolve({ remoteId: "t1", externalId: undefined });
    await pending;
    await microtasks(5);
    expect(onSwitchToNewThread).not.toHaveBeenCalled();
  });

  it("opens a controlled threadId whose fetch failed once the list loads it", async () => {
    const list = deferred<{
      threads: { status: "regular"; remoteId: string; title: string }[];
    }>();
    const adapter = makeAdapter({
      list: vi.fn(() => list.promise),
      fetch: vi.fn(async () => {
        throw new Error("network");
      }),
    });
    const { handle } = mountList(adapter, "t1");
    await waitFor(() => expect(adapter.fetch).toHaveBeenCalledWith("t1"));

    list.resolve({
      threads: [{ status: "regular", remoteId: "t1", title: "One" }],
    });
    await handle.getClient().threads.getLoadThreadsPromise();
    await waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe("t1");
    });
    handle.destroy();
  });

  it("opens a controlled threadId whose fetch failed once a later page loads it", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async (options?: { after?: string }) =>
        options?.after === "c1"
          ? {
              threads: [
                { status: "regular" as const, remoteId: "t1", title: "One" },
              ],
            }
          : {
              threads: [
                { status: "regular" as const, remoteId: "t0", title: "Zero" },
              ],
              nextCursor: "c1",
            },
      ),
      fetch: vi.fn(async () => {
        throw new Error("network");
      }),
    });
    const { handle } = mountList(adapter, "t1");
    const threads = handle.getClient().threads;
    await waitFor(() => expect(adapter.fetch).toHaveBeenCalledWith("t1"));
    await waitFor(() => {
      expect(threads.getState().threadIds).toEqual(["t0"]);
    });

    await threads.loadMore();
    await waitFor(() => {
      expect(threads.getState().mainThreadId).toBe("t1");
    });
    handle.destroy();
  });

  it("keeps the latest switch when an earlier fetch resolves last", async () => {
    const fetchB = deferred<{
      status: "regular";
      remoteId: string;
      externalId: undefined;
      title: string;
    }>();
    const fetchC = deferred<{
      status: "regular";
      remoteId: string;
      externalId: undefined;
      title: string;
    }>();
    const adapter = makeAdapter({
      fetch: vi.fn((id: string) =>
        id === "thread-b" ? fetchB.promise : fetchC.promise,
      ),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();

    flushTapSync(() => aui.threads.switchToThread("thread-b"));
    flushTapSync(() => aui.threads.switchToThread("thread-c"));
    fetchC.resolve({
      status: "regular",
      remoteId: "thread-c",
      externalId: undefined,
      title: "thread-c",
    });
    await waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe(
        "thread-c",
      );
    });
    fetchB.resolve({
      status: "regular",
      remoteId: "thread-b",
      externalId: undefined,
      title: "thread-b",
    });
    await waitFor(() => {
      expect(adapter.fetch).toHaveBeenCalledWith("thread-b");
    });
    expect(handle.getClient().threads.getState().mainThreadId).toBe("thread-c");
    handle.destroy();
  });

  it("resolves item(main) after reload without aliasing another thread", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({ threads: [] })),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    const localId = aui.threads.getState().mainThreadId;
    await aui.threads.item("main").initialize();
    adapter.list = vi.fn(async () => ({
      threads: [
        { status: "regular" as const, remoteId: "other", title: "Other" },
        {
          status: "regular" as const,
          remoteId: `remote-${localId}`,
          title: "Mine",
        },
      ],
    }));
    await handle.getClient().threads.reload();
    await waitFor(() => {
      expect(handle.getClient().threads.getState().threadIds).toEqual([
        "other",
        localId,
      ]);
    });
    expect(handle.getClient().threads.item("main").getState().remoteId).toBe(
      `remote-${localId}`,
    );
    expect(handle.getClient().threads.item("main").getState().title).toBe(
      "Mine",
    );
    handle.destroy();
  });

  it("keeps one slot per remote id across reload and clears it on delete", async () => {
    const onDelete = vi.fn();
    const adapter = makeAdapter({
      list: vi.fn(async () => ({ threads: [] })),
    });
    const { handle } = mountList(
      adapter,
      undefined,
      undefined,
      undefined,
      onDelete,
    );
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    const localId = aui.threads.getState().mainThreadId;
    await aui.threads.item("main").initialize();
    const remoteId = `remote-${localId}`;
    adapter.list = vi.fn(async () => ({
      threads: [{ status: "regular" as const, remoteId, title: "Mine" }],
    }));
    await aui.threads.reload();
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual([localId]);
    });

    await aui.threads.item({ id: remoteId }).delete();
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual([]);
    });
    expect(() => aui.threads.item({ id: localId }).getState()).toThrow();
    expect(() => aui.threads.item({ id: remoteId }).getState()).toThrow();
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledWith(localId);
    handle.destroy();
  });

  it("keeps a thread deleted during the list() flight deleted", async () => {
    const list = deferred<{ threads: RemoteThreadMetadata[] }>();
    const adapter = makeAdapter({
      list: vi.fn(() => list.promise),
      initialize: vi.fn(async () => ({
        remoteId: "remote-1",
        externalId: undefined,
      })),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    const loading = aui.threads.getLoadThreadsPromise();
    const localId = aui.threads.getState().mainThreadId;
    await aui.threads.item("main").initialize();
    await aui.threads.item({ id: localId }).delete();
    expect(adapter.delete).toHaveBeenCalledWith("remote-1");

    list.resolve({ threads: [{ status: "regular", remoteId: "remote-1" }] });
    await loading;

    await waitFor(() => {
      expect(aui.threads.getState().isLoading).toBe(false);
    });
    expect(aui.threads.getState().threadIds).toEqual([]);
    handle.destroy();
  });

  it("does not invoke deletion cleanup when the remote deletion fails", async () => {
    const error = new Error("delete failed");
    const onDelete = vi.fn();
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
      delete: vi.fn(async () => {
        throw error;
      }),
    });
    const { handle } = mountList(
      adapter,
      undefined,
      undefined,
      undefined,
      onDelete,
    );
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toContain("t1");
    });

    await expect(aui.threads.item({ id: "t1" }).delete()).rejects.toBe(error);

    expect(aui.threads.getState().threadIds).toContain("t1");
    expect(onDelete).not.toHaveBeenCalled();
    handle.destroy();
  });

  it("keeps a local thread deleted when history cleanup fails", async () => {
    const threadsKey = "@assistant-ui:threads";
    const messagesKey = "@assistant-ui:messages:t1";
    const values = new Map([
      [threadsKey, JSON.stringify([{ remoteId: "t1", status: "regular" }])],
      [messagesKey, JSON.stringify({ messages: [] })],
    ]);
    const cleanupError = new Error("Storage unavailable");
    const removeItem = vi.fn(async () => {
      throw cleanupError;
    });
    const adapter = createLocalStorageAdapter({
      storage: {
        getItem: async (key) => values.get(key) ?? null,
        setItem: async (key, value) => {
          values.set(key, value);
        },
        removeItem,
      },
    });
    const onDelete = vi.fn();
    const { handle } = mountList(
      adapter,
      undefined,
      undefined,
      undefined,
      onDelete,
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const aui = handle.getClient();
      await aui.threads.getLoadThreadsPromise();
      await waitFor(() => {
        expect(aui.threads.getState().threadIds).toContain("t1");
      });

      await expect(
        aui.threads.item({ id: "t1" }).delete(),
      ).resolves.toBeUndefined();

      expect(removeItem).toHaveBeenCalledWith(messagesKey);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("local history cleanup failed"),
        cleanupError,
      );
      expect((await adapter.list()).threads).toEqual([]);
      await waitFor(() => {
        expect(aui.threads.getState().threadIds).not.toContain("t1");
        expect(onDelete).toHaveBeenCalledWith("t1");
      });
    } finally {
      handle.destroy();
      warn.mockRestore();
    }
  });

  const deleteDuringAdapterSwap = async (
    replacementThreads: RemoteThreadMetadata[],
  ) => {
    const removal = deferred<void>();
    const onDelete = vi.fn();
    const adapterA = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
      delete: vi.fn(() => removal.promise),
    });
    const adapterB = makeAdapter({
      list: vi.fn(async () => ({ threads: replacementThreads })),
    });
    let adapter: RemoteThreadListAdapter = adapterA;
    const listeners = new Set<() => void>();
    const source: AssistantConfigSource = {
      getConfig: () =>
        AuiConfig({
          threads: RemoteThreadList({
            adapter,
            thread: (id) => StubThread({ threadId: id }) as never,
            onDelete,
          }),
        }),
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };
    const handle = createAssistantClient(source);
    handle.subscribe(() => {});
    await handle.getClient().threads.getLoadThreadsPromise();
    await waitFor(() => {
      expect(handle.getClient().threads.getState().threadIds).toContain("t1");
    });

    const deletion = handle.getClient().threads.item({ id: "t1" }).delete();
    await waitFor(() => {
      expect(adapterA.delete).toHaveBeenCalledWith("t1");
    });

    adapter = adapterB;
    for (const listener of listeners) listener();
    await vi.waitFor(async () => {
      flushTapSync(() => {});
      await handle.getClient().threads.reload();
      expect(adapterB.list).toHaveBeenCalled();
      expect(handle.getClient().threads.getState().threadIds).toEqual(
        replacementThreads.map((thread) => thread.remoteId),
      );
    });

    removal.resolve();
    await deletion;
    return { handle, onDelete };
  };

  it("invokes deletion cleanup when the adapter changes during a successful deletion", async () => {
    const { handle, onDelete } = await deleteDuringAdapterSwap([]);

    expect(onDelete).toHaveBeenCalledWith("t1");
    handle.destroy();
  });

  it("skips deletion cleanup when the replacement adapter re-lists the deleted id", async () => {
    const { handle, onDelete } = await deleteDuringAdapterSwap([
      { status: "regular" as const, remoteId: "t1", title: "One" },
    ]);

    expect(handle.getClient().threads.getState().threadIds).toContain("t1");
    expect(onDelete).not.toHaveBeenCalled();
    handle.destroy();
  });

  const mountRacedInitialize = async (status: "regular" | "archived") => {
    const initialize = deferred<{ remoteId: string; externalId: undefined }>();
    const adapter = makeAdapter({
      list: vi.fn(async () => ({ threads: [] })),
      initialize: vi.fn(() => initialize.promise),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    const localId = aui.threads.getState().mainThreadId;
    const initialization = aui.threads.item("main").initialize();

    adapter.list = vi.fn(async () => ({
      threads: [{ status, remoteId: "remote-1", title: "Mine" }],
    }));
    await aui.threads.reload();

    initialize.resolve({ remoteId: "remote-1", externalId: undefined });
    await initialization;
    return { handle, aui, localId };
  };

  it("collapses a slot the list minted while initialize was in flight", async () => {
    const { handle, aui, localId } = await mountRacedInitialize("regular");

    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual([localId]);
    });
    expect(aui.threads.item({ id: "remote-1" }).getState().id).toBe(localId);

    await aui.threads.item({ id: "remote-1" }).delete();
    await waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual([]);
    });
    expect(() => aui.threads.item({ id: localId }).getState()).toThrow();
    handle.destroy();
  });

  it("does not leave the collapsed slot in both lists when the race reported it archived", async () => {
    const { handle, aui, localId } = await mountRacedInitialize("archived");

    await waitFor(() => {
      expect(aui.threads.item({ id: "remote-1" }).getState().id).toBe(localId);
    });
    expect(aui.threads.getState().threadIds).toEqual([localId]);
    expect(aui.threads.getState().archivedThreadIds).toEqual([]);
    handle.destroy();
  });

  it("keeps item(main) isRunning after reload remaps the local id", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({ threads: [] })),
    });
    const handle = createAssistantClient(
      AuiConfig({
        threads: RemoteThreadList({
          adapter,
          thread: (id) =>
            StubThread({ threadId: id, isRunning: true }) as never,
        }),
      }),
    );
    handle.subscribe(() => {});
    await handle.getClient().threads.getLoadThreadsPromise();
    const localId = handle.getClient().threads.getState().mainThreadId;
    await handle.getClient().threads.item("main").initialize();
    adapter.list = vi.fn(async () => ({
      threads: [
        {
          status: "regular" as const,
          remoteId: `remote-${localId}`,
          title: "Mine",
        },
      ],
    }));
    await handle.getClient().threads.reload();
    await waitFor(() => {
      expect(handle.getClient().threads.item("main").getState().remoteId).toBe(
        `remote-${localId}`,
      );
    });
    expect(handle.getClient().threads.item("main").getState().isRunning).toBe(
      true,
    );
    handle.destroy();
  });

  it("switches away when deleting the remapped main thread by remote id", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({ threads: [] })),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    const localId = aui.threads.getState().mainThreadId;
    await aui.threads.item("main").initialize();
    const remoteId = `remote-${localId}`;
    adapter.list = vi.fn(async () => ({
      threads: [{ status: "regular" as const, remoteId, title: "Mine" }],
    }));
    await handle.getClient().threads.reload();
    await waitFor(() => {
      expect(
        handle.getClient().threads.item({ id: remoteId }).getState().remoteId,
      ).toBe(remoteId);
    });
    flushTapSync(() =>
      handle.getClient().threads.item({ id: remoteId }).delete(),
    );
    await waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).not.toBe(
        localId,
      );
      expect(handle.getClient().threads.getState().threadIds).not.toContain(
        remoteId,
      );
    });
    expect(() =>
      handle.getClient().threads.item("main").getState(),
    ).not.toThrow();
    handle.destroy();
  });

  it("does not reload when the adapter object is recreated", async () => {
    const methods = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
    });
    let adapter: RemoteThreadListAdapter = { ...methods };
    const listeners = new Set<() => void>();
    const source: AssistantConfigSource = {
      getConfig: () =>
        AuiConfig({
          threads: RemoteThreadList({
            adapter,
            thread: (id) => StubThread({ threadId: id }) as never,
          }),
        }),
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };
    const handle = createAssistantClient(source);
    handle.subscribe(() => {});
    await handle.getClient().threads.getLoadThreadsPromise();
    await waitFor(() => {
      expect(handle.getClient().threads.getState().threadIds).toEqual(["t1"]);
    });
    expect(methods.list).toHaveBeenCalledTimes(1);
    adapter = { ...methods };
    for (const listener of listeners) listener();
    await waitFor(() => {
      expect(handle.getClient().threads.getState().threadIds).toEqual(["t1"]);
    });
    expect(methods.list).toHaveBeenCalledTimes(1);
    handle.destroy();
  });

  it("resets selection when reload follows a different adapter instance", async () => {
    const methodsA = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "regular" as const, remoteId: "thread-a", title: "A" },
        ],
      })),
    });
    const methodsB = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "regular" as const, remoteId: "thread-b", title: "B" },
        ],
      })),
    });
    let adapter: RemoteThreadListAdapter = { ...methodsA };
    const listeners = new Set<() => void>();
    const source: AssistantConfigSource = {
      getConfig: () =>
        AuiConfig({
          threads: RemoteThreadList({
            adapter,
            thread: (id) => StubThread({ threadId: id }) as never,
          }),
        }),
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };
    const handle = createAssistantClient(source);
    handle.subscribe(() => {});
    await handle.getClient().threads.getLoadThreadsPromise();
    flushTapSync(() => handle.getClient().threads.switchToThread("thread-a"));
    await waitFor(() => {
      expect(handle.getClient().threads.item("main").getState().remoteId).toBe(
        "thread-a",
      );
    });

    adapter = { ...methodsB };
    for (const listener of listeners) listener();
    await vi.waitFor(async () => {
      flushTapSync(() => {});
      await handle.getClient().threads.reload();
      expect(handle.getClient().threads.getState().threadIds).toEqual([
        "thread-b",
      ]);
    });
    expect(
      handle.getClient().threads.item("main").getState().remoteId,
    ).not.toBe("thread-a");
    expect(handle.getClient().threads.item("main").getState().status).toBe(
      "new",
    );
    expect(methodsB.list).toHaveBeenCalled();
    handle.destroy();
  });

  it.each(
    (["none", "before reload", "during reload"] as const).flatMap(
      (manualSwitch) =>
        [false, true].map((listed) => ({ manualSwitch, listed })),
    ),
  )(
    "preserves controlled replacement selection with manual=$manualSwitch and listed=$listed",
    async ({ manualSwitch, listed }) => {
      const replacement = deferred<{ threads: RemoteThreadMetadata[] }>();
      let adapter = makeAdapter({
        list: vi.fn(async () => ({
          threads: [{ status: "regular" as const, remoteId: "thread-a" }],
        })),
      });
      let threadId = "thread-a";
      const onThreadIdChange = vi.fn();
      const listeners = new Set<() => void>();
      const handle = createAssistantClient({
        getConfig: () =>
          AuiConfig({
            threads: RemoteThreadList({
              adapter,
              threadId,
              onThreadIdChange,
              thread: (id) => StubThread({ threadId: id }) as never,
            }),
          }),
        subscribe: (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      });
      handle.subscribe(() => {});
      try {
        await handle.getClient().threads.getLoadThreadsPromise();
        await waitFor(() =>
          expect(handle.getClient().threads.getState().mainThreadId).toBe(
            "thread-a",
          ),
        );
        adapter = makeAdapter({ list: vi.fn(() => replacement.promise) });
        threadId = "thread-b";
        flushTapSync(() => listeners.forEach((listener) => listener()));
        if (manualSwitch === "before reload") {
          await handle.getClient().threads.switchToThread("manual");
        }
        let reload!: Promise<void>;
        flushTapSync(() => {
          reload = handle.getClient().threads.reload();
        });
        const draftId = handle.getClient().threads.getState().mainThreadId;
        if (manualSwitch === "during reload") {
          await handle.getClient().threads.switchToThread("manual");
        }
        replacement.resolve({
          threads: listed ? [{ status: "regular", remoteId: "thread-b" }] : [],
        });
        await reload;
        await waitFor(() =>
          expect(handle.getClient().threads.getState().isLoading).toBe(false),
        );
        const expectedId =
          manualSwitch === "none"
            ? "thread-b"
            : manualSwitch === "during reload"
              ? "manual"
              : draftId;
        await waitFor(() =>
          expect(handle.getClient().threads.getState().mainThreadId).toBe(
            expectedId,
          ),
        );
        if (manualSwitch === "none")
          expect(onThreadIdChange).not.toHaveBeenCalled();
        if (manualSwitch === "during reload") {
          const fetched = deferred<RemoteThreadMetadata>();
          const fetch = vi.mocked(adapter.fetch);
          const previousCalls = fetch.mock.calls.length;
          fetch.mockReturnValue(fetched.promise);
          threadId = "not-listed";
          flushTapSync(() => listeners.forEach((listener) => listener()));
          await handle.getClient().threads.reload();
          await microtasks(20);
          expect(fetch).toHaveBeenCalledTimes(previousCalls + 1);
          fetched.resolve({ status: "regular", remoteId: "not-listed" });
          await waitFor(() =>
            expect(handle.getClient().threads.getState().mainThreadId).toBe(
              "not-listed",
            ),
          );
        }
      } finally {
        handle.destroy();
      }
    },
  );

  it.each([
    {
      name: "retains an unlisted controlled selection through a failed replacement load",
      reopen: undefined,
      failedFetches: 0,
    },
    {
      name: "reopens an unlisted controlled selection through a replacement adapter whose list fails, then after a later load",
      reopen: true,
      failedFetches: 1,
    },
  ])("$name", async ({ reopen, failedFetches }) => {
    const selected = { status: "regular" as const, remoteId: "selected" };
    let threadId = "old-selected";
    let adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ ...selected, remoteId: threadId }],
      })),
    });
    const listeners = new Set<() => void>();
    const onThreadIdChange = vi.fn();
    const handle = createAssistantClient({
      getConfig: () =>
        AuiConfig({
          threads: RemoteThreadList({
            adapter,
            threadId,
            onThreadIdChange,
            __internal_reopenControlledThreadOnAdapterChange: reopen,
            thread: (id) => StubThread({ threadId: id }) as never,
          }),
        }),
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    });
    handle.subscribe(() => {});
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      await handle.getClient().threads.getLoadThreadsPromise();
      await waitFor(() =>
        expect(handle.getClient().threads.getState().mainThreadId).toBe(
          "old-selected",
        ),
      );
      const error = new Error("offline");
      const list = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ threads: [] });
      const fetch = vi.fn(async () => {
        if (list.mock.calls.length < 2) throw error;
        return selected;
      });
      adapter = makeAdapter({ list, fetch });
      threadId = "selected";
      flushTapSync(() => listeners.forEach((listener) => listener()));
      const fetchesBeforeReload = fetch.mock.calls.length;
      await handle.getClient().threads.reload();
      await microtasks(20);
      expect(handle.getClient().threads.getState().loadError).toBe(error);
      expect(fetch).toHaveBeenCalledTimes(fetchesBeforeReload + failedFetches);
      if (reopen) expect(fetch).toHaveBeenLastCalledWith("selected");
      await handle.getClient().threads.reload();
      await waitFor(() =>
        expect(handle.getClient().threads.getState().mainThreadId).toBe(
          "selected",
        ),
      );
      expect(fetch).toHaveBeenCalledTimes(
        fetchesBeforeReload + failedFetches + 1,
      );
      expect(fetch).toHaveBeenLastCalledWith("selected");
      expect(onThreadIdChange).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
      handle.destroy();
    }
  });

  it("does not reset again when retrying a failed replacement load", async () => {
    const error = new Error("network");
    const methodsA = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "regular" as const, remoteId: "thread-a", title: "A" },
        ],
      })),
    });
    const methodsB = makeAdapter({
      list: vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue({
          threads: [
            { status: "regular" as const, remoteId: "thread-b", title: "B" },
          ],
        }),
    });
    let adapter: RemoteThreadListAdapter = { ...methodsA };
    const listeners = new Set<() => void>();
    const source: AssistantConfigSource = {
      getConfig: () =>
        AuiConfig({
          threads: RemoteThreadList({
            adapter,
            thread: (id) => StubThread({ threadId: id }) as never,
          }),
        }),
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };
    const handle = createAssistantClient(source);
    handle.subscribe(() => {});
    await handle.getClient().threads.getLoadThreadsPromise();
    flushTapSync(() => handle.getClient().threads.switchToThread("thread-a"));
    await waitFor(() => {
      expect(handle.getClient().threads.item("main").getState().remoteId).toBe(
        "thread-a",
      );
    });

    adapter = { ...methodsB };
    for (const listener of listeners) listener();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      await vi.waitFor(async () => {
        flushTapSync(() => {});
        await handle.getClient().threads.reload();
        expect(handle.getClient().threads.item("main").getState().status).toBe(
          "new",
        );
      });
      const mainAfterFailure = handle
        .getClient()
        .threads.getState().mainThreadId;
      expect(handle.getClient().threads.getState().loadError).toBe(error);
      await handle.getClient().threads.reload();
      await waitFor(() => {
        expect(handle.getClient().threads.getState().threadIds).toEqual([
          "thread-b",
        ]);
      });
      expect(handle.getClient().threads.getState().mainThreadId).toBe(
        mainAfterFailure,
      );
      expect(handle.getClient().threads.getState().loadError).toBeUndefined();
    } finally {
      consoleError.mockRestore();
    }
    handle.destroy();
  });

  it("does not retry a failed list load when the controlled threadId changes", async () => {
    const error = new Error("offline");
    const list = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue({ threads: [] });
    const fetch = vi.fn(async (id: string) => ({
      status: "regular" as const,
      remoteId: id,
      externalId: undefined,
      title: id,
    }));
    const adapter = makeAdapter({ list, fetch });
    const listeners = new Set<() => void>();
    const onThreadIdChange = vi.fn();
    let threadId: string | undefined;
    const handle = createAssistantClient({
      getConfig: () =>
        AuiConfig({
          threads: RemoteThreadList({
            adapter,
            threadId,
            onThreadIdChange,
            thread: (id) => StubThread({ threadId: id }) as never,
          }),
        }),
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    });
    handle.subscribe(() => {});
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(handle.getClient().threads.getState().loadError).toBe(error),
      );

      threadId = "t1";
      flushTapSync(() => listeners.forEach((listener) => listener()));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledExactlyOnceWith("t1");
        expect(handle.getClient().threads.getState().mainThreadId).toBe("t1");
      });
      expect(list).toHaveBeenCalledTimes(1);
    } finally {
      consoleError.mockRestore();
      handle.destroy();
    }
  });

  it("retries a failed initial list load when reloaded", async () => {
    const error = new Error("offline");
    const list = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue({ threads: [] });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { handle } = mountList(makeAdapter({ list }));

    try {
      await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(handle.getClient().threads.getState().loadError).toBe(error),
      );

      await handle.getClient().threads.reload();

      await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
      await waitFor(() =>
        expect(handle.getClient().threads.getState().loadError).toBeUndefined(),
      );
      expect(list).toHaveBeenCalledTimes(2);
    } finally {
      handle.destroy();
      consoleError.mockRestore();
    }
  });

  it("reloads once when the browser comes online after a failed load", async () => {
    vi.stubGlobal("window", new EventTarget());
    vi.stubGlobal(
      "document",
      Object.assign(new EventTarget(), { visibilityState: "visible" }),
    );
    const error = new Error("offline");
    const firstLoad = deferred<{ threads: [] }>();
    const list = vi
      .fn()
      .mockReturnValueOnce(firstLoad.promise)
      .mockResolvedValueOnce({ threads: [] });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { handle } = mountList(makeAdapter({ list }));

    try {
      await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
      firstLoad.reject(error);
      await waitFor(() =>
        expect(handle.getClient().threads.getState().loadError).toBe(error),
      );

      window.dispatchEvent(new Event("online"));

      await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
      await waitFor(() =>
        expect(handle.getClient().threads.getState().loadError).toBeUndefined(),
      );
      expect(list).toHaveBeenCalledTimes(2);
    } finally {
      handle.destroy();
      consoleError.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("retries once when the document becomes visible after a failed load", async () => {
    vi.stubGlobal("window", new EventTarget());
    const document = Object.assign(new EventTarget(), {
      visibilityState: "hidden",
    });
    vi.stubGlobal("document", document);
    const error = new Error("offline");
    const firstLoad = deferred<{ threads: [] }>();
    const list = vi
      .fn()
      .mockReturnValueOnce(firstLoad.promise)
      .mockResolvedValueOnce({ threads: [] });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { handle } = mountList(makeAdapter({ list }));

    try {
      await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
      firstLoad.reject(error);
      await waitFor(() =>
        expect(handle.getClient().threads.getState().loadError).toBe(error),
      );

      document.dispatchEvent(new Event("visibilitychange"));
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(list).toHaveBeenCalledTimes(1);

      document.visibilityState = "visible";
      document.dispatchEvent(new Event("visibilitychange"));

      await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
      await waitFor(() =>
        expect(handle.getClient().threads.getState().loadError).toBeUndefined(),
      );
      expect(list).toHaveBeenCalledTimes(2);
    } finally {
      handle.destroy();
      consoleError.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("does not send a superseded rename through the replacement adapter", async () => {
    const initializeRequest = deferred<{
      remoteId: string;
      externalId: string | undefined;
    }>();
    const methodsA = makeAdapter({
      list: vi.fn(async () => ({ threads: [] })),
      initialize: vi.fn(() => initializeRequest.promise),
    });
    const methodsB = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "regular" as const, remoteId: "thread-b", title: "B" },
        ],
      })),
    });
    let adapter: RemoteThreadListAdapter = { ...methodsA };
    const listeners = new Set<() => void>();
    const source: AssistantConfigSource = {
      getConfig: () =>
        AuiConfig({
          threads: RemoteThreadList({
            adapter,
            thread: (id) => StubThread({ threadId: id }) as never,
          }),
        }),
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };
    const handle = createAssistantClient(source);
    handle.subscribe(() => {});
    await handle.getClient().threads.getLoadThreadsPromise();
    const initializeTask = handle.getClient().threads.item("main").initialize();
    const renameTask = handle.getClient().threads.item("main").rename("leaked");

    adapter = { ...methodsB };
    for (const listener of listeners) listener();
    await vi.waitFor(async () => {
      flushTapSync(() => {});
      await handle.getClient().threads.reload();
      expect(handle.getClient().threads.getState().threadIds).toEqual([
        "thread-b",
      ]);
    });
    initializeRequest.resolve({
      remoteId: "leaked",
      externalId: undefined,
    });
    await expect(initializeTask).rejects.toThrow("adapter changed");
    await expect(renameTask).rejects.toThrow("adapter changed");
    expect(methodsA.rename).not.toHaveBeenCalled();
    expect(methodsB.rename).not.toHaveBeenCalled();
    handle.destroy();
  });

  it("exposes useAdapters adapters to the thread factory", async () => {
    const history = dummyHistory();
    const capture: { adapters: RuntimeAdapters | null } = { adapters: null };
    const adapter = makeAdapter({
      unstable_useAdapters: useHistoryAdapters(history),
    });
    const handle = createAssistantClient(
      AuiConfig({
        threads: RemoteThreadList({
          adapter,
          thread: (id) => CapturingThread({ threadId: id, capture }) as never,
        }),
      }),
    );
    handle.subscribe(() => {});
    await handle.getClient().threads.getLoadThreadsPromise();
    expect(capture.adapters?.history).toBe(history);
    handle.destroy();
  });

  it("does not warn when useAdapters is supplied and the factory is keyed", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const adapter = makeAdapter({
        unstable_Provider: () => null,
        unstable_useAdapters: useHistoryAdapters(dummyHistory()),
      });
      const handle = createAssistantClient(
        AuiConfig({
          threads: RemoteThreadList({
            adapter,
            thread: (id) => withKey(id, StubThread({ threadId: id }) as never),
          }),
        }),
      );
      handle.subscribe(() => {});
      await handle.getClient().threads.getLoadThreadsPromise();
      flushTapSync(() => {});
      expect(warn).not.toHaveBeenCalled();
      handle.destroy();
    } finally {
      warn.mockRestore();
    }
  });

  it("warns when Provider is supplied without useAdapters", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const adapter = makeAdapter({
        unstable_Provider: () => null,
      });
      const { handle } = mountList(adapter);
      await handle.getClient().threads.getLoadThreadsPromise();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("unstable_useAdapters"),
      );
      handle.destroy();
    } finally {
      warn.mockRestore();
    }
  });

  it("warns when a history adapter arrives with an unkeyed thread factory", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const adapter = makeAdapter({
        unstable_useAdapters: useHistoryAdapters(dummyHistory()),
      });
      const handle = createAssistantClient(
        AuiConfig({
          threads: RemoteThreadList({
            adapter,
            thread: (id) => StubThread({ threadId: id }) as never,
          }),
        }),
      );
      handle.subscribe(() => {});
      await handle.getClient().threads.getLoadThreadsPromise();
      flushTapSync(() => {});
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("unkeyed"));
      handle.destroy();
    } finally {
      warn.mockRestore();
    }
  });

  it("picks up a swapped useAdapters hook on a config update", async () => {
    const firstHistory = dummyHistory();
    const secondHistory = dummyHistory();
    const capture: { adapters: RuntimeAdapters | null } = { adapters: null };
    let adapter = makeAdapter({
      unstable_useAdapters: useHistoryAdapters(firstHistory),
    });
    const listeners = new Set<() => void>();
    const source: AssistantConfigSource = {
      getConfig: () =>
        AuiConfig({
          threads: RemoteThreadList({
            adapter,
            thread: (id) => CapturingThread({ threadId: id, capture }) as never,
          }),
        }),
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };
    const handle = createAssistantClient(source);
    handle.subscribe(() => {});
    await handle.getClient().threads.getLoadThreadsPromise();
    expect(capture.adapters?.history).toBe(firstHistory);
    adapter = makeAdapter({
      unstable_useAdapters: useHistoryAdapters(secondHistory),
    });
    for (const listener of listeners) listener();
    await waitFor(() => {
      expect(capture.adapters?.history).toBe(secondHistory);
    });
    handle.destroy();
  });

  it("lets useAdapters read the assistant client via useAui after mount", async () => {
    const seen: { aui: ReturnType<typeof useAui> | null } = { aui: null };
    const adapter = makeAdapter({
      unstable_useAdapters: function useAdapters() {
        seen.aui = useAui();
        return { history: dummyHistory() };
      },
    });
    const { handle } = mountList(adapter);
    await handle.getClient().threads.getLoadThreadsPromise();
    expect(seen.aui?.threadListItem.getState().id).toBe(
      handle.getClient().threads.getState().mainThreadId,
    );
    handle.destroy();
  });

  it("does not remount useAdapters when switching an unkeyed thread", async () => {
    let mounts = 0;
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
      unstable_useAdapters: function useAdapters() {
        useState(() => {
          mounts += 1;
          return mounts;
        });
        return { history: dummyHistory() };
      },
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    const afterLoad = mounts;
    expect(afterLoad).toBeGreaterThan(0);
    flushTapSync(() => aui.threads.switchToThread("t1"));
    await waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe("t1");
    });
    expect(mounts).toBe(afterLoad);
    handle.destroy();
  });

  it("keeps unkeyed thread mount count independent of useAdapters", async () => {
    const run = async (
      mounts: { n: number },
      useAdapters?: RemoteThreadListAdapter["unstable_useAdapters"],
    ) => {
      const adapter = makeAdapter({
        list: vi.fn(async () => ({
          threads: [
            { status: "regular" as const, remoteId: "t1", title: "One" },
          ],
        })),
        unstable_useAdapters: useAdapters,
      });
      const handle = createAssistantClient(
        AuiConfig({
          threads: RemoteThreadList({
            adapter,
            thread: (id) => CountingThread({ threadId: id, mounts }) as never,
          }),
        }),
      );
      handle.subscribe(() => {});
      const aui = handle.getClient();
      await aui.threads.getLoadThreadsPromise();
      flushTapSync(() => aui.threads.switchToThread("t1"));
      await waitFor(() => {
        expect(handle.getClient().threads.getState().mainThreadId).toBe("t1");
      });
      handle.destroy();
    };
    const withoutHook = { n: 0 };
    const withHook = { n: 0 };
    await run(withoutHook);
    await run(withHook, useHistoryAdapters(dummyHistory()));
    expect(withHook.n).toBe(withoutHook.n);
  });

  it("forwards a caller key onto the useAdapters wrapper", async () => {
    const run = async (
      mounts: { n: number },
      useAdapters?: RemoteThreadListAdapter["unstable_useAdapters"],
    ) => {
      const adapter = makeAdapter({
        list: vi.fn(async () => ({
          threads: [
            { status: "regular" as const, remoteId: "t1", title: "One" },
          ],
        })),
        unstable_useAdapters: useAdapters,
      });
      const handle = createAssistantClient(
        AuiConfig({
          threads: RemoteThreadList({
            adapter,
            thread: (id) =>
              withKey(id, CountingThread({ threadId: id, mounts }) as never),
          }),
        }),
      );
      handle.subscribe(() => {});
      const aui = handle.getClient();
      await aui.threads.getLoadThreadsPromise();
      flushTapSync(() => aui.threads.switchToThread("t1"));
      await waitFor(() => {
        expect(handle.getClient().threads.getState().mainThreadId).toBe("t1");
      });
      handle.destroy();
    };
    const withoutHook = { n: 0 };
    const withHook = { n: 0 };
    await run(withoutHook);
    await run(withHook, useHistoryAdapters(dummyHistory()));
    expect(withHook.n).toBe(withoutHook.n);
    expect(withHook.n).toBeGreaterThan(1);
  });

  it("loads history for the second thread when the factory is keyed", async () => {
    const load = vi.fn(async () => ({ messages: [] }));
    const history: ThreadHistoryAdapter = {
      load,
      append: async () => {},
    };
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "regular" as const, remoteId: "t1", title: "One" },
          { status: "regular" as const, remoteId: "t2", title: "Two" },
        ],
      })),
      unstable_useAdapters: useHistoryAdapters(history),
    });
    const handle = createAssistantClient(
      AuiConfig({
        threads: RemoteThreadList({
          adapter,
          thread: (id) =>
            withKey(id, HistoryLoadingThread({ threadId: id }) as never),
          threadId: "t1",
        }),
      }),
    );
    handle.subscribe(() => {});
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    await waitFor(() => {
      expect(load).toHaveBeenCalled();
    });
    const afterFirst = load.mock.calls.length;
    flushTapSync(() => aui.threads.switchToThread("t2"));
    await waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe("t2");
    });
    await waitFor(() => {
      expect(load.mock.calls.length).toBeGreaterThan(afterFirst);
    });
    handle.destroy();
  });

  it("does not re-emit onSwitchToNewThread when the draft is already main", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
    });
    const listeners = new Set<() => void>();
    let threadId: string | undefined = "t1";
    const onSwitchToNewThread = vi.fn();
    const source: AssistantConfigSource = {
      getConfig: () =>
        AuiConfig({
          threads: RemoteThreadList({
            adapter,
            thread: (id) => StubThread({ threadId: id }) as never,
            threadId,
            onThreadIdChange: (id) => {
              threadId = id;
              for (const listener of listeners) listener();
            },
            onSwitchToNewThread,
          }),
        }),
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };
    const handle = createAssistantClient(source);
    handle.subscribe(() => {});
    await handle.getClient().threads.getLoadThreadsPromise();
    await waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe("t1");
    });
    flushTapSync(() => handle.getClient().threads.switchToNewThread());
    await waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).not.toBe("t1");
    });
    expect(onSwitchToNewThread).toHaveBeenCalledTimes(1);
    handle.destroy();
  });

  it("does not refetch a draft from reloadMainThread", async () => {
    const refetch = vi.fn(async () => {});
    const { handle } = mountList(makeAdapter(), undefined, refetch);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    expect(aui.threads.item("main").getState().status).toBe("new");
    await aui.threads.reloadMainThread();
    expect(refetch).not.toHaveBeenCalled();
    handle.destroy();
  });

  it("refetches the initialized main thread when initialize resolves", async () => {
    let handle: ReturnType<typeof createAssistantClient> | undefined;
    const requests: {
      id: string;
      remoteId: string | undefined;
      status: string;
    }[] = [];
    const refetch = vi.fn(async () => {
      const { id, remoteId, status } = handle!
        .getClient()
        .threads.item("main")
        .getState();
      requests.push({ id, remoteId, status });
    });
    const adapter = makeAdapter({
      initialize: vi.fn(async () => ({
        remoteId: "saved",
        externalId: undefined,
      })),
    });
    const mounted = mountList(adapter, undefined, refetch);
    handle = mounted.handle;

    try {
      const threads = handle.getClient().threads;
      await threads.getLoadThreadsPromise();
      const id = threads.getState().mainThreadId;
      await threads.item("main").initialize();
      await threads.reloadMainThread();

      expect(requests).toEqual([{ id, remoteId: "saved", status: "regular" }]);
    } finally {
      handle.destroy();
    }
  });

  it("keeps the selected thread when config callbacks are recreated", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
    });
    const listeners = new Set<() => void>();
    let onThreadIdChange = vi.fn();
    const source: AssistantConfigSource = {
      getConfig: () =>
        AuiConfig({
          threads: RemoteThreadList({
            adapter,
            thread: (id) => StubThread({ threadId: id }) as never,
            onThreadIdChange,
          }),
        }),
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };
    const handle = createAssistantClient(source);
    handle.subscribe(() => {});
    await handle.getClient().threads.getLoadThreadsPromise();
    flushTapSync(() => handle.getClient().threads.switchToThread("t1"));
    await waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe("t1");
    });
    onThreadIdChange = vi.fn();
    for (const listener of listeners) listener();
    await waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe("t1");
    });
    expect(handle.getClient().threads.getState().mainThreadId).toBe("t1");
    handle.destroy();
  });

  it("does not re-emit onSwitchToThread for the already selected thread", async () => {
    const onSwitchToThread = vi.fn();
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
    });
    const { handle } = mountList(
      adapter,
      undefined,
      undefined,
      onSwitchToThread,
    );
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    flushTapSync(() => aui.threads.switchToThread("t1"));
    await waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe("t1");
    });
    onSwitchToThread.mockClear();
    flushTapSync(() => handle.getClient().threads.switchToThread("t1"));
    expect(onSwitchToThread).not.toHaveBeenCalled();
    handle.destroy();
  });

  it("keeps item(main) resolvable after a same-tick switch then delete", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    await waitFor(() => {
      expect(handle.getClient().threads.getState().threadIds).toEqual(["t1"]);
    });
    flushTapSync(() => {
      handle.getClient().threads.switchToThread("t1");
      handle.getClient().threads.item({ id: "t1" }).delete();
    });
    await waitFor(() => {
      expect(handle.getClient().threads.getState().threadIds).not.toContain(
        "t1",
      );
    });
    expect(handle.getClient().threads.getState().mainThreadId).not.toBe("t1");
    expect(() =>
      handle.getClient().threads.item("main").getState(),
    ).not.toThrow();
    handle.destroy();
  });

  it("does not unarchive an archived thread deleted during initialization", async () => {
    const { adapter, handle, targetId, initialization, initialize } =
      await mountArchivedInitializingThread();
    const aui = handle.getClient();
    flushTapSync(() => aui.threads.switchToThread(targetId));
    flushTapSync(() => aui.threads.item({ id: targetId }).delete());
    await waitFor(() => {
      const state = handle.getClient().threads.getState();
      expect(state.threadIds).not.toContain(targetId);
      expect(state.archivedThreadIds).not.toContain(targetId);
    });

    initialize.resolve({
      remoteId: `remote-${targetId}`,
      externalId: undefined,
    });
    await initialization;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(adapter.unarchive).not.toHaveBeenCalled();
    expect(handle.getClient().threads.getState().mainThreadId).toBe("fallback");
    expect(() =>
      handle.getClient().threads.item("main").getState(),
    ).not.toThrow();
    handle.destroy();
  });

  it("does not unarchive again when the target became regular during initialization", async () => {
    const { adapter, handle, targetId, initialization, initialize } =
      await mountArchivedInitializingThread();
    const aui = handle.getClient();

    flushTapSync(() => aui.threads.switchToThread(targetId));
    flushTapSync(() => aui.threads.item({ id: targetId }).unarchive());
    await waitFor(() => {
      expect(
        handle.getClient().threads.item({ id: targetId }).getState().status,
      ).toBe("regular");
    });

    initialize.resolve({
      remoteId: `remote-${targetId}`,
      externalId: undefined,
    });
    await initialization;
    await waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe(targetId);
    });

    expect(adapter.unarchive).toHaveBeenCalledTimes(1);
    expect(adapter.unarchive).toHaveBeenCalledWith(`remote-${targetId}`);
    handle.destroy();
  });

  it("keeps item(main) resolvable when deleting an archived thread during unarchive", async () => {
    const unarchive = deferred<void>();
    const onSwitchToThread = vi.fn();
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "archived" as const, remoteId: "t1", title: "One" },
        ],
      })),
      unarchive: vi.fn(() => unarchive.promise),
    });
    const { handle } = mountList(
      adapter,
      undefined,
      undefined,
      onSwitchToThread,
    );
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    const initialMainThreadId = aui.threads.getState().mainThreadId;

    flushTapSync(() => aui.threads.switchToThread("t1"));
    await waitFor(() => {
      expect(adapter.unarchive).toHaveBeenCalledWith("t1");
    });
    flushTapSync(() => aui.threads.item({ id: "t1" }).delete());
    await waitFor(() => {
      const state = handle.getClient().threads.getState();
      expect(state.threadIds).not.toContain("t1");
      expect(state.archivedThreadIds).not.toContain("t1");
    });

    unarchive.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(handle.getClient().threads.getState().mainThreadId).toBe(
      initialMainThreadId,
    );
    expect(() =>
      handle.getClient().threads.item("main").getState(),
    ).not.toThrow();
    expect(onSwitchToThread).not.toHaveBeenCalled();
    handle.destroy();
  });

  it("keeps item(main) resolvable when deleting a thread mid-initialize", async () => {
    const initialize = deferred<{
      remoteId: string;
      externalId: undefined;
    }>();
    const adapter = makeAdapter({
      initialize: vi.fn(() => initialize.promise),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    const localId = aui.threads.getState().mainThreadId;
    const pending = aui.threads.item("main").initialize();
    await waitFor(() => {
      expect(handle.getClient().threads.item("main").getState().status).toBe(
        "regular",
      );
    });
    flushTapSync(() =>
      handle.getClient().threads.item({ id: localId }).delete(),
    );
    initialize.resolve({
      remoteId: `remote-${localId}`,
      externalId: undefined,
    });
    await waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).not.toBe(
        localId,
      );
    });
    expect(() =>
      handle.getClient().threads.item("main").getState(),
    ).not.toThrow();
    await pending;
    handle.destroy();
  });

  it("emits onThreadIdChange after initialize settles", async () => {
    const adapter = makeAdapter();
    const { handle, onThreadIdChange } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    const localId = aui.threads.getState().mainThreadId;
    await aui.threads.item("main").initialize();
    await waitFor(() => {
      expect(onThreadIdChange).toHaveBeenCalledWith(`remote-${localId}`);
    });
    handle.destroy();
  });

  it("emits the settled id before switching away from an initializing draft", async () => {
    const initialize = deferred<{ remoteId: string; externalId: undefined }>();
    const adapter = makeAdapter({
      initialize: vi.fn(() => initialize.promise),
    });
    const reportedIds: (string | undefined)[] = [];
    const onThreadIdChange = vi.fn((id: string | undefined) => {
      reportedIds.push(id);
    });
    const { handle } = mountList(
      adapter,
      undefined,
      undefined,
      undefined,
      undefined,
      onThreadIdChange,
    );
    const threads = handle.getClient().threads;
    await threads.getLoadThreadsPromise();

    const initialization = threads.item("main").initialize();
    await waitFor(() => {
      expect(threads.item("main").getState().status).toBe("regular");
    });
    flushTapSync(() => threads.switchToNewThread());
    expect(onThreadIdChange).not.toHaveBeenCalled();

    initialize.resolve({ remoteId: "r1", externalId: undefined });
    await initialization;
    await waitFor(() => {
      expect(handle.getClient().threads.item("main").getState().status).toBe(
        "new",
      );
    });
    await waitFor(() => {
      expect(reportedIds).toEqual(["r1", undefined]);
    });
    handle.destroy();
  });

  it("keeps a pending new-thread switch when the settled id is echoed synchronously", async () => {
    const initialize = deferred<{ remoteId: string; externalId: undefined }>();
    const adapter = makeAdapter({
      initialize: vi.fn(() => initialize.promise),
    });
    const listeners = new Set<() => void>();
    const switchSequence: string[] = [];
    let threadId: string | undefined;
    let echoing = false;
    let readR1DuringEcho = false;
    const onThreadIdChange = vi.fn((id: string | undefined) => {
      switchSequence.push(`echo:${id ?? "new"}`);
      threadId = id;
      echoing = true;
      for (const listener of listeners) listener();
      echoing = false;
    });
    const source: AssistantConfigSource = {
      getConfig: () => {
        if (echoing && threadId === "r1") readR1DuringEcho = true;
        return AuiConfig({
          threads: RemoteThreadList({
            adapter,
            thread: (id) => StubThread({ threadId: id }) as never,
            threadId,
            onThreadIdChange,
            onSwitchToThread: (id) => switchSequence.push(`selected:${id}`),
            onSwitchToNewThread: () => switchSequence.push("selected:new"),
          }),
        });
      },
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
    const handle = createAssistantClient(source);
    handle.subscribe(() => {});
    const threads = handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const initializingId = threads.getState().mainThreadId;
    const initialization = threads.item("main").initialize();
    await waitFor(() => {
      expect(threads.item("main").getState().status).toBe("regular");
    });

    switchSequence.push("requested:new");
    flushTapSync(() => threads.switchToNewThread());
    expect(onThreadIdChange).not.toHaveBeenCalled();

    initialize.resolve({ remoteId: "r1", externalId: undefined });
    await initialization;
    await waitFor(() => {
      expect(onThreadIdChange).toHaveBeenCalledWith("r1");
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await waitFor(() => {
      const currentThreads = handle.getClient().threads;
      const main = currentThreads.item("main").getState();
      expect(
        {
          mainIdIsNew: main.id !== initializingId,
          status: main.status,
          remoteId: main.remoteId,
          r1InList: currentThreads
            .getState()
            .threadIds.includes(initializingId),
          r1RemoteId: currentThreads.item({ id: "r1" }).getState().remoteId,
          readR1DuringEcho,
          echoBeforeNew:
            switchSequence.indexOf("echo:r1") <
            switchSequence.indexOf("selected:new"),
          switchSequence,
        },
        `Switch sequence: ${switchSequence.join(" -> ")}`,
      ).toEqual({
        mainIdIsNew: true,
        status: "new",
        remoteId: undefined,
        r1InList: true,
        r1RemoteId: "r1",
        readR1DuringEcho: true,
        echoBeforeNew: true,
        switchSequence: expect.arrayContaining([
          "requested:new",
          "echo:r1",
          "selected:new",
        ]),
      });
    });
    handle.destroy();
  });

  it("keeps an echoed switch to an initializing thread selected until its id settles", async () => {
    const initialize = deferred<{ remoteId: string; externalId: undefined }>();
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "regular" as const, remoteId: "r0", title: "Zero" },
        ],
      })),
      initialize: vi.fn(() => initialize.promise),
    });
    const listeners = new Set<() => void>();
    let threadId: string | undefined;
    const onThreadIdChange = vi.fn((id: string | undefined) => {
      threadId = id;
      for (const listener of listeners) listener();
    });
    const source: AssistantConfigSource = {
      getConfig: () =>
        AuiConfig({
          threads: RemoteThreadList({
            adapter,
            thread: (id) => StubThread({ threadId: id }) as never,
            threadId,
            onThreadIdChange,
          }),
        }),
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
    const handle = createAssistantClient(source);
    handle.subscribe(() => {});
    const threads = handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const initializingId = threads.getState().mainThreadId;
    const initialization = threads.item("main").initialize();
    await waitFor(() => {
      expect(handle.getClient().threads.item("main").getState().status).toBe(
        "regular",
      );
    });

    threadId = "r0";
    for (const listener of listeners) listener();
    await waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe("r0");
    });
    flushTapSync(() =>
      handle.getClient().threads.item({ id: initializingId }).switchTo(),
    );
    await waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe(
        initializingId,
      );
    });
    expect(onThreadIdChange).not.toHaveBeenCalledWith(undefined);

    initialize.resolve({ remoteId: "r1", externalId: undefined });
    await initialization;
    await waitFor(() => {
      const main = handle.getClient().threads.item("main").getState();
      expect(main.remoteId).toBe("r1");
      expect(main.status).toBe("regular");
    });
    handle.destroy();
  });

  it("keeps a completed switch when onThreadIdChange throws", async () => {
    const callbackError = new Error("host callback failed");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onThreadIdChange = vi.fn(() => {
      throw callbackError;
    });
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
    });
    const { handle } = mountList(
      adapter,
      undefined,
      undefined,
      undefined,
      undefined,
      onThreadIdChange,
    );
    const threads = handle.getClient().threads;
    try {
      await threads.getLoadThreadsPromise();

      flushTapSync(() => threads.switchToThread("t1"));

      await waitFor(() => {
        expect(handle.getClient().threads.getState().mainThreadId).toBe("t1");
        expect(onThreadIdChange).toHaveBeenCalledExactlyOnceWith("t1");
        expect(errorSpy).toHaveBeenCalledWith(
          "[assistant-ui] onThreadIdChange callback threw an error",
          callbackError,
        );
      });
    } finally {
      handle.destroy();
      errorSpy.mockRestore();
    }
  });
});

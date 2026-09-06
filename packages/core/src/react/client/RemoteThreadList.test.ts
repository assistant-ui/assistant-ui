import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { flushTapSync, resource, withKey } from "@assistant-ui/tap";
import { useAui } from "@assistant-ui/store";
import {
  AuiConfig,
  createAssistantClient,
  type AssistantConfigSource,
} from "@assistant-ui/store/client";
import type { ThreadHistoryAdapter } from "../../adapters/thread-history";
import type { RemoteThreadListAdapter } from "../../runtimes/remote-thread-list/types";
import {
  useRuntimeAdapters,
  type RuntimeAdapters,
} from "../runtimes/RuntimeAdapterProvider";
import { RemoteThreadList } from "./RemoteThreadList";

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
}) => ({
  getState: () => ({
    isRunning: props.isRunning === true,
    messages: [],
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

const mountList = (
  adapter: RemoteThreadListAdapter,
  threadId?: string,
  refetch?: () => Promise<void>,
  onSwitchToThread?: (id: string) => void,
  onDelete?: (id: string) => void,
) => {
  const onThreadIdChange = vi.fn();
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
  await vi.waitFor(() => {
    expect(handle.getClient().threads.item("main").getState().status).toBe(
      "regular",
    );
  });
  flushTapSync(() => aui.threads.switchToThread("fallback"));
  await vi.waitFor(() => {
    expect(handle.getClient().threads.getState().mainThreadId).toBe("fallback");
  });
  flushTapSync(() => aui.threads.item({ id: targetId }).archive());
  await vi.waitFor(() => {
    expect(handle.getClient().threads.getState().archivedThreadIds).toContain(
      targetId,
    );
  });
  return { adapter, handle, targetId, initialization, initialize };
};

describe("RemoteThreadList", () => {
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
    await vi.waitFor(() => {
      const state = handle.getClient().threads.getState();
      expect(state.threadIds).toEqual(["t1"]);
      expect(state.archivedThreadIds).toEqual(["t2"]);
      expect(state.isLoading).toBe(false);
    });
    const state = handle.getClient().threads.getState();
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
    await vi.waitFor(() => {
      expect(aui.threads.getState().archivedThreadIds).toEqual(["t1"]);
    });

    flushTapSync(() =>
      aui.threads.item({ id: "t1" }).switchTo({ unarchive: false }),
    );
    await vi.waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t1");
    });

    await expect(aui.threads.item({ id: "t1" }).unarchive()).rejects.toBe(
      error,
    );
    expect(aui.threads.item({ id: "t1" }).getState().status).toBe("archived");
    await vi.waitFor(() => {
      expect(aui.threads.getState().mainThreadId).not.toBe("t1");
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
    await vi.waitFor(() => {
      expect(aui.threads.getState().archivedThreadIds).toContain("t1");
    });
    await aui.threads.item("main").initialize();

    flushTapSync(() =>
      aui.threads.item({ id: "t1" }).switchTo({ unarchive: false }),
    );
    await vi.waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t1");
    });

    await expect(aui.threads.item({ id: "t1" }).unarchive()).rejects.toBe(
      error,
    );
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
      expect(aui.threads.getState().threadIds).toContain(initializedId);
    });

    listDeferred.resolve({
      threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
    });
    await loadPromise;

    flushTapSync(() => aui.threads.switchToNewThread());
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
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

  it("renames and deletes through the adapter", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    await vi.waitFor(() => {
      expect(handle.getClient().threads.getState().threadIds).toEqual(["t1"]);
    });

    flushTapSync(() =>
      handle.getClient().threads.item({ id: "t1" }).rename("Renamed"),
    );
    await vi.waitFor(() => {
      expect(adapter.rename).toHaveBeenCalledWith("t1", "Renamed");
      expect(
        handle.getClient().threads.item({ id: "t1" }).getState().title,
      ).toBe("Renamed");
    });

    const draftId = handle.getClient().threads.getState().mainThreadId;
    flushTapSync(() => handle.getClient().threads.item({ id: "t1" }).delete());
    await vi.waitFor(() => {
      expect(adapter.delete).toHaveBeenCalledWith("t1");
      expect(handle.getClient().threads.getState().threadIds).not.toContain(
        "t1",
      );
      expect(handle.getClient().threads.getState().mainThreadId).toBe(draftId);
    });
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
    await vi.waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual(["t1"]);
    });
    flushTapSync(() => aui.threads.switchToThread("t1"));
    await vi.waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t1");
    });

    const generation = aui.threads
      .item({ id: "t1" })
      .generateTitle({ automatic: true });
    await vi.waitFor(() => {
      expect(adapter.generateTitle).toHaveBeenCalledOnce();
    });
    await aui.threads.item({ id: "t1" }).rename("Manual title");
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t1");
    });

    const reloadPromise = aui.threads.reload();
    await vi.waitFor(() => {
      expect(adapter.list).toHaveBeenCalledTimes(2);
    });
    await aui.threads.item({ id: "t1" }).rename("Renamed");
    await aui.threads.item({ id: "t1" }).generateTitle();
    await vi.waitFor(() => {
      expect(aui.threads.item({ id: "t1" }).getState().title).toBe("Generated");
    });

    reload.resolve({
      threads: [{ status: "regular", remoteId: "t1", title: "One" }],
    });
    await reloadPromise;
    await vi.waitFor(() => {
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

    await vi.waitFor(() => {
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

    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe("t1");
    });
    expect(onThreadIdChange).not.toHaveBeenCalled();
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
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual([localId]);
    });

    await aui.threads.item({ id: remoteId }).delete();
    await vi.waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual([]);
    });
    expect(() => aui.threads.item({ id: localId }).getState()).toThrow();
    expect(() => aui.threads.item({ id: remoteId }).getState()).toThrow();
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledWith(localId);
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
    await vi.waitFor(() => {
      expect(aui.threads.getState().threadIds).toContain("t1");
    });

    await expect(aui.threads.item({ id: "t1" }).delete()).rejects.toBe(error);

    expect(aui.threads.getState().threadIds).toContain("t1");
    expect(onDelete).not.toHaveBeenCalled();
    handle.destroy();
  });

  const deleteDuringAdapterSwap = async (
    replacementThreads: readonly {
      status: "regular";
      remoteId: string;
      title: string;
    }[],
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
    await vi.waitFor(() => {
      expect(handle.getClient().threads.getState().threadIds).toContain("t1");
    });

    const deletion = handle.getClient().threads.item({ id: "t1" }).delete();
    await vi.waitFor(() => {
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

    await vi.waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual([localId]);
    });
    expect(aui.threads.item({ id: "remote-1" }).getState().id).toBe(localId);

    await aui.threads.item({ id: "remote-1" }).delete();
    await vi.waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual([]);
    });
    expect(() => aui.threads.item({ id: localId }).getState()).toThrow();
    handle.destroy();
  });

  it("does not leave the collapsed slot in both lists when the race reported it archived", async () => {
    const { handle, aui, localId } = await mountRacedInitialize("archived");

    await vi.waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual([localId]);
    });
    expect(aui.threads.getState().archivedThreadIds).toEqual([]);
    expect(aui.threads.item({ id: "remote-1" }).getState().id).toBe(localId);
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
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
      expect(
        handle.getClient().threads.item({ id: remoteId }).getState().remoteId,
      ).toBe(remoteId);
    });
    flushTapSync(() =>
      handle.getClient().threads.item({ id: remoteId }).delete(),
    );
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
      expect(handle.getClient().threads.getState().threadIds).toEqual(["t1"]);
    });
    expect(methods.list).toHaveBeenCalledTimes(1);
    adapter = { ...methods };
    for (const listener of listeners) listener();
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
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
      await vi.waitFor(() => {
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
      await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(1));
      firstLoad.reject(error);
      await vi.waitFor(() =>
        expect(handle.getClient().threads.getState().loadError).toBe(error),
      );

      window.dispatchEvent(new Event("online"));

      await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(2));
      await vi.waitFor(() =>
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
      await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(1));
      firstLoad.reject(error);
      await vi.waitFor(() =>
        expect(handle.getClient().threads.getState().loadError).toBe(error),
      );

      document.dispatchEvent(new Event("visibilitychange"));
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(list).toHaveBeenCalledTimes(1);

      document.visibilityState = "visible";
      document.dispatchEvent(new Event("visibilitychange"));

      await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(2));
      await vi.waitFor(() =>
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
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
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
      await vi.waitFor(() => {
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
      await vi.waitFor(() => {
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
    await vi.waitFor(() => {
      expect(load).toHaveBeenCalled();
    });
    const afterFirst = load.mock.calls.length;
    flushTapSync(() => aui.threads.switchToThread("t2"));
    await vi.waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe("t2");
    });
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe("t1");
    });
    flushTapSync(() => handle.getClient().threads.switchToNewThread());
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe("t1");
    });
    onThreadIdChange = vi.fn();
    for (const listener of listeners) listener();
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
      expect(handle.getClient().threads.getState().threadIds).toEqual(["t1"]);
    });
    flushTapSync(() => {
      handle.getClient().threads.switchToThread("t1");
      handle.getClient().threads.item({ id: "t1" }).delete();
    });
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
      expect(
        handle.getClient().threads.item({ id: targetId }).getState().status,
      ).toBe("regular");
    });

    initialize.resolve({
      remoteId: `remote-${targetId}`,
      externalId: undefined,
    });
    await initialization;
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
      expect(adapter.unarchive).toHaveBeenCalledWith("t1");
    });
    flushTapSync(() => aui.threads.item({ id: "t1" }).delete());
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
      expect(onThreadIdChange).toHaveBeenCalledWith(`remote-${localId}`);
    });
    handle.destroy();
  });
});

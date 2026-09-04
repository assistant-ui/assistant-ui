import { useEffect, useState } from "react";
import { useResource } from "@assistant-ui/tap";
import { describe, expect, it, vi } from "vitest";
import { flushTapSync, resource, withKey } from "@assistant-ui/tap";
import { AuiConfig, createAssistantClient } from "@assistant-ui/store/client";
import type { ThreadHistoryAdapter } from "../../adapters/thread-history";
import type { RemoteThreadListAdapter } from "../../runtimes/remote-thread-list/types";
import { useRuntimeAdapters } from "../runtimes/RuntimeAdapterProvider";
import { RemoteThreadList } from "./RemoteThreadList";

const stubComposer = { getState: () => ({}) };
const stubSuggestions = { getState: () => ({ suggestions: [] }) };

type Tracker = {
  mounts: string[];
  alive: Set<string>;
  running: Set<string>;
  messagesOf?: (id: string) => readonly { status?: { type: string } }[];
};

const useTrackedThread = (props: { threadId: string; tracker: Tracker }) => {
  useState(() => {
    props.tracker.mounts.push(props.threadId);
    return true;
  });
  useEffect(() => {
    const { tracker, threadId } = props;
    tracker.alive.add(threadId);
    return () => {
      tracker.alive.delete(threadId);
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- lifecycle probe tracks the mounted identity
  }, []);
  return {
    getState: () => ({
      isRunning: props.tracker.running.has(props.threadId),
      messages: props.tracker.messagesOf?.(props.threadId) ?? [],
    }),
    composer: () => stubComposer,
    suggestions: () => stubSuggestions,
  };
};
const TrackedThread = resource(useTrackedThread);

const useHistoryLoadingThread = (props: {
  threadId: string;
  tracker: Tracker;
  loads: string[];
}) => {
  const adapters = useRuntimeAdapters();
  useState(() => {
    if (adapters?.history) {
      props.loads.push(props.threadId);
      void adapters.history.load();
    }
    return true;
  });
  return useTrackedThread(props);
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

const mountBackgroundList = (
  adapter: RemoteThreadListAdapter,
  tracker: Tracker,
) => {
  const handle = createAssistantClient(
    AuiConfig({
      threads: RemoteThreadList({
        adapter,
        backgroundThreads: true,
        thread: (id) =>
          withKey(id, TrackedThread({ threadId: id, tracker }) as never),
      }),
    }),
  );
  handle.subscribe(() => {});
  return handle;
};

const createTracker = (): Tracker => ({
  mounts: [],
  alive: new Set(),
  running: new Set(),
});

describe("RemoteThreadList backgroundThreads", () => {
  it("keeps a switched-away thread mounted with live isRunning", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
    });
    const tracker = createTracker();
    const handle = mountBackgroundList(adapter, tracker);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    await vi.waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual(["t1"]);
    });
    const newThreadId = aui.threads.getState().mainThreadId;

    flushTapSync(() => aui.threads.switchToThread("t1"));
    await vi.waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t1");
      expect(tracker.mounts).toContain("t1");
    });
    const t1MountsAfterFirstVisit = tracker.mounts.filter(
      (id) => id === "t1",
    ).length;

    tracker.running.add("t1");
    flushTapSync(() => aui.threads.switchToThread(newThreadId));
    await vi.waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe(newThreadId);
    });

    expect(tracker.alive.has("t1")).toBe(true);
    await vi.waitFor(() => {
      expect(aui.threads.item({ id: "t1" }).getState().isRunning).toBe(true);
    });
    expect(aui.threads.item("main").getState().isRunning).toBe(false);
    expect(tracker.mounts.filter((id) => id === "t1")).toHaveLength(
      t1MountsAfterFirstVisit,
    );
    handle.destroy();
  });

  it("keeps archived bodies mounted and unmounts on delete and detach", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "regular" as const, remoteId: "t1", title: "One" },
          { status: "regular" as const, remoteId: "t2", title: "Two" },
        ],
      })),
    });
    const tracker = createTracker();
    const handle = mountBackgroundList(adapter, tracker);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    await vi.waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual(["t1", "t2"]);
    });

    flushTapSync(() => aui.threads.switchToThread("t1"));
    await vi.waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t1");
    });
    flushTapSync(() => aui.threads.switchToThread("t2"));
    await vi.waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t2");
    });

    flushTapSync(() => aui.threads.item({ id: "t1" }).archive());
    await vi.waitFor(() => {
      expect(aui.threads.getState().archivedThreadIds).toEqual(["t1"]);
    });
    expect(tracker.alive.has("t1")).toBe(true);

    flushTapSync(() => aui.threads.item({ id: "t1" }).delete());
    await vi.waitFor(() => {
      expect(tracker.alive.has("t1")).toBe(false);
    });

    flushTapSync(() => aui.threads.item({ id: "t2" }).detach());
    await vi.waitFor(() => {
      expect(tracker.alive.has("t2")).toBe(false);
    });
    expect(aui.threads.getState().mainThreadId).not.toBe("t2");
    handle.destroy();
  });

  it("loads history once per thread body instead of once per switch", async () => {
    const history: ThreadHistoryAdapter = {
      load: async () => ({ messages: [] }),
      append: async () => {},
    };
    const useAdapters = () => ({ history });
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
      unstable_useAdapters: useAdapters,
    });
    const tracker = createTracker();
    const loads: string[] = [];
    const handle = createAssistantClient(
      AuiConfig({
        threads: RemoteThreadList({
          adapter,
          backgroundThreads: true,
          thread: (id) =>
            HistoryLoadingThread({ threadId: id, tracker, loads }) as never,
        }),
      }),
    );
    handle.subscribe(() => {});
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    await vi.waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual(["t1"]);
    });
    const newThreadId = aui.threads.getState().mainThreadId;

    flushTapSync(() => aui.threads.switchToThread("t1"));
    await vi.waitFor(() => {
      expect(loads).toContain("t1");
    });
    const t1LoadsAfterFirstVisit = loads.filter((id) => id === "t1").length;
    flushTapSync(() => aui.threads.switchToThread(newThreadId));
    await vi.waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe(newThreadId);
    });
    flushTapSync(() => aui.threads.switchToThread("t1"));
    await vi.waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t1");
    });

    expect(loads.filter((id) => id === "t1")).toHaveLength(
      t1LoadsAfterFirstVisit,
    );
    expect(tracker.alive.has("t1")).toBe(true);
    handle.destroy();
  });

  it("generates a title once after a new thread initializes, never for loaded threads", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
    });
    const tracker = createTracker();
    tracker.messagesOf = () => [{ status: { type: "complete" } }];
    const handle = mountBackgroundList(adapter, tracker);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    await vi.waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual(["t1"]);
    });
    const newThreadId = aui.threads.getState().mainThreadId;

    flushTapSync(() => aui.threads.switchToThread("t1"));
    await vi.waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t1");
    });
    flushTapSync(() => aui.threads.switchToThread(newThreadId));
    await vi.waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe(newThreadId);
    });
    expect(adapter.generateTitle).not.toHaveBeenCalled();

    await aui.threads.item("main").initialize();
    await vi.waitFor(() => {
      expect(adapter.generateTitle).toHaveBeenCalledOnce();
    });
    expect(adapter.generateTitle).toHaveBeenCalledWith(
      `remote-${newThreadId}`,
      expect.any(Array),
    );

    flushTapSync(() => aui.threads.switchToThread("t1"));
    await vi.waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t1");
    });
    expect(adapter.generateTitle).toHaveBeenCalledOnce();
    handle.destroy();
  });

  it("keeps the mode fixed when the prop flips after mount", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
    });
    const tracker = createTracker();
    let flip!: () => void;
    const useFlippingThreads = () => {
      const [background, setBackground] = useState(true);
      flip = () => setBackground(false);
      return useResource(
        RemoteThreadList({
          adapter,
          backgroundThreads: background,
          thread: (id) =>
            withKey(id, TrackedThread({ threadId: id, tracker }) as never),
        }),
      );
    };
    const FlippingThreads = resource(useFlippingThreads);
    const handle = createAssistantClient(
      AuiConfig({ threads: FlippingThreads() as never }),
    );
    handle.subscribe(() => {});
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    await vi.waitFor(() => {
      expect(aui.threads.getState().threadIds).toEqual(["t1"]);
    });
    const newThreadId = aui.threads.getState().mainThreadId;
    flushTapSync(() => aui.threads.switchToThread("t1"));
    await vi.waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe("t1");
    });
    flushTapSync(() => aui.threads.switchToThread(newThreadId));
    await vi.waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe(newThreadId);
    });
    expect(tracker.alive.has("t1")).toBe(true);

    flushTapSync(() => flip());
    await vi.waitFor(() => {
      expect(aui.threads.getState().mainThreadId).toBe(newThreadId);
    });
    expect(tracker.alive.has("t1")).toBe(true);
    handle.destroy();
  });

  it("keeps one body when a reload remaps a local thread to its remote id", async () => {
    let listed: { status: "regular"; remoteId: string; title: string }[] = [];
    const adapter = makeAdapter({
      list: vi.fn(async () => ({ threads: listed })),
    });
    const tracker = createTracker();
    const handle = mountBackgroundList(adapter, tracker);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    const localId = aui.threads.getState().mainThreadId;

    await aui.threads.item("main").initialize();
    const remoteId = `remote-${localId}`;
    listed = [{ status: "regular" as const, remoteId, title: "One" }];
    await aui.threads.reload();
    await vi.waitFor(() => {
      expect(aui.threads.getState().threadIds).toContain(localId);
    });
    expect(aui.threads.getState().threadIds).not.toContain(remoteId);

    flushTapSync(() => aui.threads.switchToNewThread());
    await vi.waitFor(() => {
      expect(aui.threads.getState().mainThreadId).not.toBe(localId);
    });
    const localMounts = tracker.mounts.filter((id) => id === localId).length;
    flushTapSync(() => aui.threads.switchToThread(remoteId));
    await vi.waitFor(() => {
      expect(aui.threads.item("main").getState().remoteId).toBe(remoteId);
    });

    expect(tracker.alive.has(localId)).toBe(true);
    expect(tracker.alive.has(remoteId)).toBe(false);
    expect(tracker.mounts.filter((id) => id === localId)).toHaveLength(
      localMounts,
    );
    handle.destroy();
  });
});

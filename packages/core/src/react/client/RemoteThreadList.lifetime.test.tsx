// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { flushTapSync, resource } from "@assistant-ui/tap";
import {
  AuiConfig,
  createAssistantClient,
  type AssistantConfigSource,
} from "@assistant-ui/store/client";
import { useAssistantClientDestroySignal } from "@assistant-ui/store/internal";
import type { RemoteThreadListAdapter } from "../../runtimes/remote-thread-list/types";
import { deferred } from "../../tests/remote-thread-list-test-helpers";
import {
  RemoteThreadList,
  type RemoteThreadListProps,
} from "./RemoteThreadList";
import { ThreadListDestroyedError } from "../../runtimes/remote-thread-list/thread-list-destroyed";
import { isSilentRuntimeAction } from "../../utils/silent-runtime-action";

const threadState = { isRunning: false, messages: [] };
const composer = { getState: () => ({}) };
const suggestions = { getState: () => ({ suggestions: [] }) };
const CapturingThread = resource(
  ({ id, signals }: { id: string; signals: Map<string, AbortSignal> }) => {
    const signal = useAssistantClientDestroySignal();
    if (signal) signals.set(id, signal);
    return {
      getState: () => threadState,
      composer: () => composer,
      suggestions: () => suggestions,
    };
  },
);

const makeAdapter = (
  overrides: Partial<RemoteThreadListAdapter> = {},
): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({
    threads: [{ remoteId: "thread-a", status: "regular" as const, title: "A" }],
  })),
  fetch: vi.fn(async (id) => ({
    remoteId: id,
    status: "regular" as const,
    title: id,
  })),
  initialize: vi.fn(async (id) => ({ remoteId: id })),
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
      }),
  ),
  ...overrides,
});

const mount = (
  initialAdapter = makeAdapter(),
  options: {
    backgroundThreads?: boolean;
    threadId?: string;
    reopenControlledThreadOnAdapterChange?: boolean;
    ensureThread?: RemoteThreadListProps["__internal_ensureThread"];
    isThreadAttached?: RemoteThreadListProps["__internal_isThreadAttached"];
    onSwitchToThread?: RemoteThreadListProps["onSwitchToThread"];
    preserveDraftOnAdapterChange?: boolean;
  } = {},
) => {
  let adapter = initialAdapter;
  const listeners = new Set<() => void>();
  const signals = new Map<string, AbortSignal>();
  const source: AssistantConfigSource = {
    getConfig: () =>
      AuiConfig({
        threads: RemoteThreadList({
          adapter,
          backgroundThreads: options.backgroundThreads,
          threadId: options.threadId,
          __internal_reopenControlledThreadOnAdapterChange:
            options.reopenControlledThreadOnAdapterChange,
          __internal_ensureThread: options.ensureThread,
          __internal_isThreadAttached: options.isThreadAttached,
          onSwitchToThread: options.onSwitchToThread,
          __internal_preserveDraftOnAdapterChange:
            options.preserveDraftOnAdapterChange,
          thread: (id) => CapturingThread({ id, signals }) as never,
        }),
      }),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  const handle = createAssistantClient(source);
  handle.subscribe(() => {});
  return {
    handle,
    signals,
    replaceAdapter(next: RemoteThreadListAdapter) {
      adapter = next;
      for (const listener of listeners) listener();
      flushTapSync(() => {});
    },
  };
};

afterEach(() => vi.restoreAllMocks());

describe("RemoteThreadList body lifetimes", () => {
  it("opens a fresh draft when the target draft initializes while its runtime attaches", async () => {
    const pending = new Map<string, () => void>();
    const { handle } = mount(makeAdapter(), {
      backgroundThreads: true,
      ensureThread: (item) =>
        new Promise<void>((resolve) => {
          pending.set(item.id, resolve);
        }),
    });
    const threads = handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const draftId = threads.getState().mainThreadId;
    const toThread =
      threads.__internal_getRawActions!().switchToThread("thread-a");
    await vi.waitFor(() => expect(pending.has("thread-a")).toBe(true));
    pending.get("thread-a")!();
    await toThread;

    const toNew = threads.__internal_getRawActions!().switchToNewThread();
    await vi.waitFor(() => expect(pending.has(draftId)).toBe(true));
    await threads.item({ id: draftId }).initialize();
    pending.get(draftId)!();
    await vi.waitFor(() => expect(pending.size).toBe(3));
    for (const [id, resolve] of pending) {
      if (id !== "thread-a" && id !== draftId) resolve();
    }
    await toNew;

    const main = threads.item("main").getState();
    expect(main.id).not.toBe(draftId);
    expect(main.status).toBe("new");
    expect(threads.item({ id: draftId }).getState().remoteId).toBe(draftId);
    handle.destroy();
  });

  it.each(["ensureThread", "unarchive"] as const)(
    "rejects a destroyed client's switch while %s is pending",
    async (pending) => {
      const operation = deferred<void>();
      const entered = deferred<void>();
      const pause = () => {
        entered.resolve();
        return operation.promise;
      };
      const ensureThread = vi.fn(
        pending === "ensureThread" ? pause : async () => {},
      );
      const onSwitchToThread = vi.fn();
      const { handle } = mount(
        makeAdapter({
          list: vi.fn(async () => ({
            threads: [{ remoteId: "thread-b", status: "archived" as const }],
          })),
          unarchive: pending === "unarchive" ? pause : async () => {},
        }),
        { ensureThread, isThreadAttached: () => false, onSwitchToThread },
      );
      const threads = handle.getClient().threads;
      await threads.getLoadThreadsPromise();
      const fulfilled = vi.fn();
      const rejected = vi.fn();
      void threads.__internal_getRawActions!()
        .switchToThread("thread-b")
        .then(fulfilled, rejected);
      await entered.promise;
      handle.destroy();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      const rejectionBeforeCompletion = rejected.mock.calls[0]?.[0];
      const ensuresBeforeCompletion = ensureThread.mock.calls.length;
      operation.resolve();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      expect(rejectionBeforeCompletion).toBeInstanceOf(
        ThreadListDestroyedError,
      );
      expect(isSilentRuntimeAction(rejectionBeforeCompletion)).toBe(true);
      expect(rejected).toHaveBeenCalledTimes(1);
      expect(fulfilled).not.toHaveBeenCalled();
      expect(ensureThread).toHaveBeenCalledTimes(ensuresBeforeCompletion);
      expect(onSwitchToThread).not.toHaveBeenCalled();
    },
  );

  it("rejects a destroyed client's switch while the client catches up to the attached thread", async () => {
    const ensureThread = vi.fn(async () => {});
    const { handle } = mount(makeAdapter(), {
      ensureThread,
      isThreadAttached: () => true,
    });
    const threads = handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const fulfilled = vi.fn();
    const rejected = vi.fn();
    void threads.__internal_getRawActions!()
      .switchToThread("thread-a")
      .then(fulfilled, rejected);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(ensureThread).toHaveBeenCalled();
    expect(threads.getState().mainThreadId).not.toBe("thread-a");
    handle.destroy();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(rejected.mock.calls[0]?.[0]).toBeInstanceOf(
      ThreadListDestroyedError,
    );
    expect(fulfilled).not.toHaveBeenCalled();
  });

  it("releases a body when ensureThread rejects", async () => {
    let rejectEnsure!: (error: Error) => void;
    const ensureThread = vi.fn(
      () =>
        new Promise<void>((_, reject) => {
          rejectEnsure = reject;
        }),
    );
    const { handle, signals } = mount(makeAdapter(), {
      backgroundThreads: true,
      ensureThread,
    });
    const threads = handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const draftId = threads.getState().mainThreadId;
    const task = threads.__internal_getRawActions!().switchToThread("thread-a");
    const rejection = expect(task).rejects.toThrow("ensure failed");
    await vi.waitFor(() => expect(signals.get("thread-a")).toBeDefined());
    const signal = signals.get("thread-a")!;
    rejectEnsure(new Error("ensure failed"));
    await rejection;
    await vi.waitFor(() =>
      expect(threads.__internal_getThreadBody!("thread-a")).toBeUndefined(),
    );
    expect(signal.aborted).toBe(true);
    expect(threads.getState().mainThreadId).toBe(draftId);
    expect(signals.get(draftId)?.aborted).toBe(false);
    handle.destroy();
  });

  it("releases a body when a newer switch supersedes ensureThread", async () => {
    let resolveEnsure!: () => void;
    const { handle, signals } = mount(makeAdapter(), {
      backgroundThreads: true,
      ensureThread: () =>
        new Promise<void>((resolve) => {
          resolveEnsure = resolve;
        }),
    });
    const threads = handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const draftId = threads.getState().mainThreadId;
    const task = threads.__internal_getRawActions!().switchToThread("thread-a");
    await vi.waitFor(() => expect(signals.get("thread-a")).toBeDefined());
    const signal = signals.get("thread-a")!;
    await threads.__internal_getRawActions!().switchToThread(draftId);
    resolveEnsure();
    await task;
    await vi.waitFor(() =>
      expect(threads.__internal_getThreadBody!("thread-a")).toBeUndefined(),
    );
    expect(signal.aborted).toBe(true);
    expect(threads.getState().mainThreadId).toBe(draftId);
    expect(signals.get(draftId)?.aborted).toBe(false);
    handle.destroy();
  });

  it("keeps a body needed by a newer switch to the same thread", async () => {
    const resolves: Array<() => void> = [];
    const { handle, signals } = mount(makeAdapter(), {
      backgroundThreads: true,
      ensureThread: () =>
        new Promise<void>((resolve) => {
          resolves.push(resolve);
        }),
    });
    const threads = handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const first =
      threads.__internal_getRawActions!().switchToThread("thread-a");
    await vi.waitFor(() => expect(signals.get("thread-a")).toBeDefined());
    const signal = signals.get("thread-a")!;
    const second =
      threads.__internal_getRawActions!().switchToThread("thread-a");
    expect(resolves).toHaveLength(2);
    resolves[0]!();
    await first;
    expect(signal.aborted).toBe(false);
    resolves[1]!();
    await second;
    await vi.waitFor(() =>
      expect(threads.getState().mainThreadId).toBe("thread-a"),
    );
    expect(signals.get("thread-a")).toBe(signal);
    handle.destroy();
  });

  it("joins repeated switches until the replacement runtime attaches", async () => {
    let attached = true;
    let resolveAttachment!: () => void;
    const attachment = new Promise<void>((resolve) => {
      resolveAttachment = resolve;
    });
    const onSwitchToThread = vi.fn();
    const { handle } = mount(
      makeAdapter({
        list: vi.fn(async () => ({
          threads: [{ remoteId: "thread-b", status: "archived" as const }],
        })),
        unarchive: vi.fn(async () => {
          attached = false;
        }),
      }),
      {
        ensureThread: () => (attached ? Promise.resolve() : attachment),
        isThreadAttached: () => attached,
        onSwitchToThread,
      },
    );
    try {
      const threads = handle.getClient().threads;
      await threads.getLoadThreadsPromise();
      const actions = threads.__internal_getRawActions!();
      const first = actions.switchToThread("thread-b");
      const firstSettled = vi.fn();
      void first.then(firstSettled, firstSettled);
      await vi.waitFor(() =>
        expect(threads.getState().mainThreadId).toBe("thread-b"),
      );
      const second = actions.switchToThread("thread-b");
      const secondSettled = vi.fn();
      void second.then(secondSettled, secondSettled);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      expect(firstSettled).not.toHaveBeenCalled();
      expect(secondSettled).not.toHaveBeenCalled();
      expect(onSwitchToThread).not.toHaveBeenCalled();
      attached = true;
      resolveAttachment();
      await Promise.all([first, second]);

      expect(firstSettled).toHaveBeenCalledTimes(1);
      expect(secondSettled).toHaveBeenCalledTimes(1);
      expect(onSwitchToThread).toHaveBeenCalledExactlyOnceWith("thread-b");
    } finally {
      resolveAttachment();
      handle.destroy();
    }
  });

  it("keeps a body that was already selected when a later ensureThread rejects", async () => {
    let targetAttempts = 0;
    const { handle, signals } = mount(makeAdapter(), {
      backgroundThreads: true,
      ensureThread: async (item) => {
        if (item.id === "thread-a" && ++targetAttempts === 2) {
          throw new Error("ensure failed");
        }
      },
    });
    const threads = handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const draftId = threads.getState().mainThreadId;
    await threads.__internal_getRawActions!().switchToThread("thread-a");
    await vi.waitFor(() =>
      expect(threads.getState().mainThreadId).toBe("thread-a"),
    );
    const signal = signals.get("thread-a")!;
    await threads.__internal_getRawActions!().switchToThread(draftId);
    await vi.waitFor(() =>
      expect(threads.getState().mainThreadId).toBe(draftId),
    );
    await expect(
      threads.__internal_getRawActions!().switchToThread("thread-a"),
    ).rejects.toThrow("ensure failed");
    expect(signal.aborted).toBe(false);
    expect(threads.__internal_getThreadBody!("thread-a")).toBeDefined();
    handle.destroy();
  });

  it("waits for ensureThread before a raw switch selects the thread", async () => {
    let resolveEnsure!: () => void;
    const ensureThread = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveEnsure = resolve;
        }),
    );
    const { handle } = mount(makeAdapter(), { ensureThread });
    const threads = handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const draftId = threads.getState().mainThreadId;
    const task = threads.__internal_getRawActions!().switchToThread("thread-a");
    expect(ensureThread).toHaveBeenCalledWith(
      expect.objectContaining({ id: "thread-a" }),
    );
    expect(threads.getState().mainThreadId).toBe(draftId);
    resolveEnsure();
    await task;
    await vi.waitFor(() =>
      expect(threads.getState().mainThreadId).toBe("thread-a"),
    );
    handle.destroy();
  });

  it.each([true, false])(
    "preserveDraftOnAdapterChange=%s controls draft identity and body",
    async (preserveDraftOnAdapterChange) => {
      const setup = mount(makeAdapter(), {
        backgroundThreads: true,
        preserveDraftOnAdapterChange,
      });
      const threads = setup.handle.getClient().threads;
      await threads.getLoadThreadsPromise();
      const draftId = threads.getState().mainThreadId;
      const draftBody = threads.__internal_getThreadBody!(draftId);
      const draftSignal = setup.signals.get(draftId)!;
      const replacement = makeAdapter();
      setup.replaceAdapter(replacement);
      await vi.waitFor(async () => {
        flushTapSync(() => {});
        await setup.handle.getClient().threads.reload();
        expect(replacement.list).toHaveBeenCalled();
      });
      const current = setup.handle.getClient().threads;
      const nextId = current.getState().mainThreadId;
      if (preserveDraftOnAdapterChange) {
        expect(nextId).toBe(draftId);
        expect(current.__internal_getThreadBody!(nextId)).toBe(draftBody);
        expect(setup.signals.get(nextId)).toBe(draftSignal);
        expect(draftSignal.aborted).toBe(false);
      } else {
        expect(nextId).not.toBe(draftId);
        expect(current.__internal_getThreadBody!(nextId)).not.toBe(draftBody);
        expect(draftSignal.aborted).toBe(true);
      }
      setup.handle.destroy();
    },
  );

  it.each([
    [true, "resolves"],
    [true, "rejects"],
    [false, "resolves"],
    [false, "rejects"],
  ] as const)(
    "initializes a carried draft once on the replacement adapter for every caller (backgroundThreads=%s, replaced initialize %s)",
    async (backgroundThreads, replacedOutcome) => {
      const replaced = deferred<{ remoteId: string }>();
      const setup = mount(
        makeAdapter({ initialize: vi.fn(() => replaced.promise) }),
        { backgroundThreads, preserveDraftOnAdapterChange: true },
      );
      const threads = setup.handle.getClient().threads;
      await threads.getLoadThreadsPromise();
      const draftId = threads.getState().mainThreadId;
      const initializations = [
        threads.item({ id: draftId }).initialize(),
        threads.item({ id: draftId }).initialize(),
      ];

      const replacement = makeAdapter({
        initialize: vi.fn(async () => ({ remoteId: "replacement-remote" })),
      });
      setup.replaceAdapter(replacement);
      await vi.waitFor(async () => {
        flushTapSync(() => {});
        await setup.handle.getClient().threads.reload();
        expect(replacement.list).toHaveBeenCalled();
      });
      if (replacedOutcome === "resolves") {
        replaced.resolve({ remoteId: "replaced-remote" });
      } else {
        replaced.reject(new Error("replaced backend unavailable"));
      }

      await expect(Promise.all(initializations)).resolves.toEqual([
        { remoteId: "replacement-remote", externalId: undefined },
        { remoteId: "replacement-remote", externalId: undefined },
      ]);
      expect(replacement.initialize).toHaveBeenCalledTimes(1);
      expect(replacement.initialize).toHaveBeenCalledWith(draftId);
      await vi.waitFor(() =>
        expect(
          setup.handle.getClient().threads.item({ id: draftId }).getState()
            .remoteId,
        ).toBe("replacement-remote"),
      );
      setup.handle.destroy();
    },
  );

  it("rejects an initialization whose draft the replacement adapter drops", async () => {
    const replaced = deferred<{ remoteId: string }>();
    const setup = mount(
      makeAdapter({ initialize: vi.fn(() => replaced.promise) }),
    );
    const threads = setup.handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const draftId = threads.getState().mainThreadId;
    const initialization = threads.item({ id: draftId }).initialize();

    const replacement = makeAdapter();
    setup.replaceAdapter(replacement);
    await vi.waitFor(async () => {
      flushTapSync(() => {});
      await setup.handle.getClient().threads.reload();
      expect(replacement.list).toHaveBeenCalled();
    });
    replaced.resolve({ remoteId: "replaced-remote" });

    const error = await initialization.catch((reason: unknown) => reason);
    expect(isSilentRuntimeAction(error)).toBe(true);
    expect(replacement.initialize).not.toHaveBeenCalled();
    setup.handle.destroy();
  });

  it("keeps a hidden single body signal alive for a later visit", async () => {
    const { handle, signals } = mount();
    const threads = handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const draftId = threads.getState().mainThreadId;
    const draftSignal = signals.get(draftId)!;
    await threads.__internal_getRawActions!().switchToThread("thread-a");
    await vi.waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe(
        "thread-a",
      );
    });
    expect(draftSignal.aborted).toBe(false);
    await handle.getClient().threads.__internal_getRawActions!().switchToThread(
      draftId,
    );
    await vi.waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe(draftId);
    });
    expect(signals.get(draftId)).toBe(draftSignal);
    handle.destroy();
  });

  it("keeps visited body signals alive across background switches", async () => {
    const { handle, signals } = mount(makeAdapter(), {
      backgroundThreads: true,
    });
    const threads = handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const draftId = threads.getState().mainThreadId;
    const draftSignal = signals.get(draftId)!;
    await threads.__internal_getRawActions!().switchToThread("thread-a");
    await vi.waitFor(() => expect(signals.get("thread-a")).toBeDefined());
    const regularSignal = signals.get("thread-a")!;
    expect(draftSignal.aborted).toBe(false);
    await threads.__internal_getRawActions!().switchToThread(draftId);
    expect(regularSignal.aborted).toBe(false);
    handle.destroy();
  });

  it.each(["delete", "detach"] as const)(
    "aborts a visited body on %s",
    async (action) => {
      const { handle, signals } = mount(makeAdapter(), {
        backgroundThreads: true,
      });
      const threads = handle.getClient().threads;
      await threads.getLoadThreadsPromise();
      const draftId = threads.getState().mainThreadId;
      await threads.__internal_getRawActions!().switchToThread("thread-a");
      await vi.waitFor(() => expect(signals.get("thread-a")).toBeDefined());
      const signal = signals.get("thread-a")!;
      await threads.__internal_getRawActions!().switchToThread(draftId);
      expect(signal.aborted).toBe(false);
      await threads.__internal_getRawActions!()[action]("thread-a");
      expect(signal.aborted).toBe(true);
      expect(signals.get(draftId)?.aborted).toBe(false);
      handle.destroy();
    },
  );

  it("aborts old body signals when reload replaces the adapter", async () => {
    const setup = mount(makeAdapter(), { backgroundThreads: true });
    const threads = setup.handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const draftId = threads.getState().mainThreadId;
    const draftSignal = setup.signals.get(draftId)!;
    await threads.__internal_getRawActions!().switchToThread("thread-a");
    await vi.waitFor(() => expect(setup.signals.get("thread-a")).toBeDefined());
    const regularSignal = setup.signals.get("thread-a")!;
    const replacement = makeAdapter();
    setup.replaceAdapter(replacement);
    expect(draftSignal.aborted).toBe(false);
    expect(regularSignal.aborted).toBe(false);
    await vi.waitFor(async () => {
      flushTapSync(() => {});
      await setup.handle.getClient().threads.reload();
      expect(replacement.list).toHaveBeenCalled();
    });
    expect(draftSignal.aborted).toBe(true);
    expect(regularSignal.aborted).toBe(true);
    setup.handle.destroy();
  });

  it("aborts every body when the client is destroyed", async () => {
    const { handle, signals } = mount(makeAdapter(), {
      backgroundThreads: true,
    });
    const threads = handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const draftSignal = signals.get(threads.getState().mainThreadId)!;
    await threads.__internal_getRawActions!().switchToThread("thread-a");
    await vi.waitFor(() => expect(signals.get("thread-a")).toBeDefined());
    const regularSignal = signals.get("thread-a")!;
    handle.destroy();
    expect(draftSignal.aborted).toBe(true);
    expect(regularSignal.aborted).toBe(true);
  });

  it("reopens a controlled thread through a replacement adapter whose list fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const replacement = makeAdapter({
      list: vi.fn(async () => {
        throw new Error("network");
      }),
      fetch: vi.fn(async (id) => ({
        remoteId: id,
        status: "regular" as const,
        title: id,
      })),
    });
    const setup = mount(makeAdapter(), {
      threadId: "thread-a",
      reopenControlledThreadOnAdapterChange: true,
    });
    await vi.waitFor(() => {
      expect(
        setup.handle.getClient().threads.item("main").getState().remoteId,
      ).toBe("thread-a");
    });
    setup.replaceAdapter(replacement);
    await vi.waitFor(async () => {
      flushTapSync(() => {});
      await setup.handle.getClient().threads.reload();
      expect(replacement.list).toHaveBeenCalled();
    });
    await vi.waitFor(() =>
      expect(replacement.fetch).toHaveBeenCalledWith("thread-a"),
    );
    await vi.waitFor(() => {
      expect(
        setup.handle.getClient().threads.item("main").getState().remoteId,
      ).toBe("thread-a");
    });
    setup.handle.destroy();
  });
});

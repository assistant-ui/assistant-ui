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
import {
  RemoteThreadList,
  type RemoteThreadListProps,
} from "./RemoteThreadList";

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

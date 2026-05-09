import { describe, it, expect, vi } from "vitest";
import { ThreadListRuntimeImpl } from "../runtime/api/thread-list-runtime";
import type { ThreadListRuntimeCore } from "../runtime/interfaces/thread-list-runtime-core";
import { EMPTY_THREAD_CORE } from "../runtimes/remote-thread-list/empty-thread-core";

const MAIN_THREAD_ID = "main-thread";

const createMockCore = (
  loadPromise: Promise<void> = Promise.resolve(),
): ThreadListRuntimeCore => ({
  isLoading: false,
  mainThreadId: MAIN_THREAD_ID,
  newThreadId: undefined,
  threadIds: [MAIN_THREAD_ID],
  archivedThreadIds: [],
  threadItems: {
    [MAIN_THREAD_ID]: {
      id: MAIN_THREAD_ID,
      remoteId: MAIN_THREAD_ID,
      externalId: undefined,
      status: "regular",
      title: undefined,
    },
  },
  getMainThreadRuntimeCore: () => EMPTY_THREAD_CORE,
  getThreadRuntimeCore: () => EMPTY_THREAD_CORE,
  getItemById: (id) => {
    if (id === MAIN_THREAD_ID) {
      return {
        id: MAIN_THREAD_ID,
        remoteId: MAIN_THREAD_ID,
        externalId: undefined,
        status: "regular",
        title: undefined,
      };
    }
    return undefined;
  },
  switchToThread: () => Promise.resolve(),
  switchToNewThread: () => Promise.resolve(),
  getLoadThreadsPromise: () => loadPromise,
  detach: () => Promise.resolve(),
  rename: () => Promise.resolve(),
  archive: () => Promise.resolve(),
  unarchive: () => Promise.resolve(),
  delete: () => Promise.resolve(),
  initialize: () => Promise.resolve({ remoteId: "r", externalId: undefined }),
  generateTitle: () => Promise.resolve(),
  subscribe: () => () => {},
});

describe("ThreadListRuntime.getLoadThreadsPromise", () => {
  it("returns a Promise that resolves", async () => {
    const runtime = new ThreadListRuntimeImpl(createMockCore());
    const result = runtime.getLoadThreadsPromise();
    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toBeUndefined();
  });

  it("delegates to the core implementation", async () => {
    let resolved = false;
    const loadPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        resolved = true;
        resolve();
      }, 10);
    });

    const runtime = new ThreadListRuntimeImpl(createMockCore(loadPromise));

    expect(resolved).toBe(false);
    await runtime.getLoadThreadsPromise();
    expect(resolved).toBe(true);
  });
});

describe("ThreadListRuntime.reload", () => {
  it("resolves to undefined when core omits reload", async () => {
    const runtime = new ThreadListRuntimeImpl(createMockCore());
    await expect(runtime.reload()).resolves.toBeUndefined();
  });

  it("delegates to core.reload when implemented", async () => {
    const reload = vi.fn<() => Promise<void>>(() => Promise.resolve());
    const core = { ...createMockCore(), reload };
    const runtime = new ThreadListRuntimeImpl(core);

    await runtime.reload();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

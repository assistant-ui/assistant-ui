import { afterEach, describe, expect, it, vi } from "vitest";
import type { RemoteThreadListResponse } from "../../runtimes/remote-thread-list/types";
import {
  createCore,
  deferred,
  makeAdapter,
} from "../../tests/remote-thread-list-test-helpers";

const loadedThread = {
  status: "regular" as const,
  remoteId: "thread-1",
  externalId: "thread-1",
  title: "Thread 1",
};

describe("RemoteThreadListThreadListRuntimeCore load errors", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps loaded threads and reports a later load failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("network error");
    const list = vi
      .fn<() => Promise<RemoteThreadListResponse>>()
      .mockResolvedValueOnce({ threads: [loadedThread] })
      .mockRejectedValueOnce(error);
    const core = createCore(makeAdapter({ list }));

    await core.getLoadThreadsPromise();
    await core.reload();

    expect(core.threadIds).toEqual(["thread-1"]);
    expect(core.loadError).toBe(error);
    expect(core.isLoading).toBe(false);
  });

  it("removes the previous adapter's threads when its replacement load fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("replacement failed");
    const core = createCore(
      makeAdapter({
        list: vi.fn(async () => ({ threads: [loadedThread] })),
      }),
    );
    await core.getLoadThreadsPromise();

    const replacement = makeAdapter({
      list: vi.fn(async () => {
        throw error;
      }),
    });
    core.__internal_setOptions({
      adapter: replacement,
      runtimeHook: () => ({}) as never,
    });
    await core.getLoadThreadsPromise();

    expect(core.threadIds).toEqual([]);
    expect(core.archivedThreadIds).toEqual([]);
    expect(core.getItemById("thread-1")).toBeUndefined();
    expect(core.mainThreadId).not.toBe("thread-1");
    expect(core.getItemById(core.mainThreadId!)).toBeDefined();
    expect(core.loadError).toBe(error);
  });

  it("clears the adapter-change gate before notifying about a failed replacement", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("replacement failed");
    const core = createCore(
      makeAdapter({
        list: vi.fn(async () => ({ threads: [loadedThread] })),
      }),
    );
    await core.getLoadThreadsPromise();

    const list = deferred<RemoteThreadListResponse>();
    core.__internal_setOptions({
      adapter: makeAdapter({ list: vi.fn(() => list.promise) }),
      runtimeHook: () => ({}) as never,
    });
    const load = core.getLoadThreadsPromise();
    const seen: Array<{
      isLoading: boolean;
      replacementPending: boolean;
      threadIds: readonly string[];
    }> = [];
    core.subscribe(() => {
      seen.push({
        isLoading: core.isLoading,
        replacementPending: (
          core as unknown as { _replaceListOnNextLoad: boolean }
        )._replaceListOnNextLoad,
        threadIds: core.threadIds,
      });
    });

    list.reject(error);
    await load;

    expect(seen.length).toBeGreaterThan(0);
    expect(
      seen.every(
        ({ isLoading, replacementPending }) => isLoading || !replacementPending,
      ),
    ).toBe(true);
    expect(seen.at(-1)).toMatchObject({
      isLoading: false,
      replacementPending: false,
      threadIds: [],
    });
    expect(core.loadError).toBe(error);
  });

  it("reports a load whose response cannot be applied and retries it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const unappliable = {
      threads: [{ ...loadedThread, status: "deleted" as never }],
    };
    const list = vi
      .fn<() => Promise<RemoteThreadListResponse>>()
      .mockResolvedValueOnce({ threads: [loadedThread] })
      .mockResolvedValue(unappliable);
    const core = createCore(makeAdapter({ list }));
    await core.getLoadThreadsPromise();
    const settled: unknown[] = [];
    let loading = false;
    core.subscribe(() => {
      if (core.isLoading) loading = true;
      else if (loading) settled.push(core.loadError);
    });

    await core.reload();

    expect(core.isLoading).toBe(false);
    expect(core.loadError).toBeInstanceOf(Error);
    expect(settled.length).toBeGreaterThan(0);
    expect(settled.every((error) => error instanceof Error)).toBe(true);

    await core.getLoadThreadsPromise();
    expect(list).toHaveBeenCalledTimes(3);
  });

  it("clears the adapter-change gate when a load rejects before its response applies", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const core = createCore(
      makeAdapter({
        list: vi.fn(async () => ({ threads: [loadedThread] })),
      }),
    );
    await core.getLoadThreadsPromise();

    core.__internal_setOptions({
      adapter: makeAdapter({ list: vi.fn(async () => ({ threads: [] })) }),
      runtimeHook: () => ({}) as never,
    });
    let thrown = false;
    core.subscribe(() => {
      if (thrown) return;
      thrown = true;
      throw new Error("subscriber failed");
    });
    await core.getLoadThreadsPromise();

    expect(
      (core as unknown as { _replaceListOnNextLoad: boolean })
        ._replaceListOnNextLoad,
    ).toBe(false);
    expect(core.getItemById("thread-1")).toBeUndefined();
    expect(core.isLoading).toBe(false);
  });

  it("clears the previous adapter's error before loading its replacement", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("network error");
    const core = createCore(
      makeAdapter({
        list: vi.fn(async () => {
          throw error;
        }),
      }),
    );
    await core.getLoadThreadsPromise();
    expect(core.loadError).toBe(error);

    const replacementLoad = deferred<RemoteThreadListResponse>();
    const replacementList = vi.fn(() => replacementLoad.promise);
    core.__internal_setOptions({
      adapter: makeAdapter({ list: replacementList }),
      runtimeHook: () => ({}) as never,
    });

    expect(replacementList).not.toHaveBeenCalled();
    expect(core.loadError).toBeUndefined();

    const loadPromise = core.getLoadThreadsPromise();
    replacementLoad.resolve({ threads: [] });
    await loadPromise;
  });

  it("clears the error when a reload resolves", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("network error");
    const list = vi
      .fn<() => Promise<RemoteThreadListResponse>>()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ threads: [loadedThread] });
    const core = createCore(makeAdapter({ list }));

    await core.getLoadThreadsPromise();
    expect(core.loadError).toBe(error);

    await core.reload();

    expect(core.loadError).toBeUndefined();
    expect(core.threadIds).toEqual(["thread-1"]);
  });

  it("clears the error while a later load is in progress", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("network error");
    const retry = deferred<RemoteThreadListResponse>();
    const list = vi
      .fn<() => Promise<RemoteThreadListResponse>>()
      .mockRejectedValueOnce(error)
      .mockReturnValueOnce(retry.promise);
    const core = createCore(makeAdapter({ list }));

    await core.getLoadThreadsPromise();
    expect(core.loadError).toBe(error);

    const retryPromise = core.reload();

    expect(core.isLoading).toBe(true);
    expect(core.loadError).toBeUndefined();

    retry.resolve({ threads: [] });
    await retryPromise;
  });
});

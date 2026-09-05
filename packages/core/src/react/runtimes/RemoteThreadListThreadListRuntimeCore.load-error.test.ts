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
    expect(core.loadError).toBe(error);
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

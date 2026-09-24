import { afterEach, describe, it, expect, vi } from "vitest";
import type { RemoteThreadListResponse } from "../runtimes/remote-thread-list/types";
import {
  createCore,
  deferred,
  makeAdapter,
  setStartThreadRuntime,
} from "./remote-thread-list-test-helpers";
import { ThreadListRuntimeImpl } from "../runtime/api/thread-list-runtime";
import { RemoteThreadListHookInstanceManager } from "../react/runtimes/RemoteThreadListHookInstanceManager";
import type { ThreadRuntimeCore } from "../runtime/interfaces/thread-runtime-core";

describe("RemoteThreadListThreadListRuntimeCore.reload", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refetches list() after a successful empty load", async () => {
    const listFn = vi
      .fn<() => Promise<RemoteThreadListResponse>>()
      .mockResolvedValueOnce({ threads: [] })
      .mockResolvedValueOnce({
        threads: [
          {
            status: "regular",
            remoteId: "t-1",
            externalId: "t-1",
            title: "After auth",
          },
        ],
      });
    const adapter = makeAdapter({ list: listFn });
    const core = createCore(adapter);

    await core.getLoadThreadsPromise();
    expect(listFn).toHaveBeenCalledTimes(1);
    expect(core.threadIds).toEqual([]);

    await core.reload();
    expect(listFn).toHaveBeenCalledTimes(2);
    expect(core.threadIds).toEqual(["t-1"]);
  });

  it("returns the same cached promise from getLoadThreadsPromise when reload is not called", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({ threads: [] })),
    });
    const core = createCore(adapter);

    const p1 = core.getLoadThreadsPromise();
    const p2 = core.getLoadThreadsPromise();
    await p1;
    await p2;

    expect(adapter.list).toHaveBeenCalledTimes(1);
  });

  it("drops stale responses when a reload is triggered mid-flight", async () => {
    const first = deferred<RemoteThreadListResponse>();
    const second = deferred<RemoteThreadListResponse>();
    const listFn = vi
      .fn<() => Promise<RemoteThreadListResponse>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const adapter = makeAdapter({ list: listFn });
    const core = createCore(adapter);

    core.getLoadThreadsPromise();
    const reloaded = core.reload();

    second.resolve({
      threads: [
        {
          status: "regular",
          remoteId: "fresh",
          externalId: "fresh",
          title: "Fresh",
        },
      ],
    });
    await reloaded;

    first.resolve({
      threads: [
        {
          status: "regular",
          remoteId: "stale",
          externalId: "stale",
          title: "Stale",
        },
      ],
    });
    // flush microtasks so the stale then() reducer runs and its generation
    // guard has a chance to discard the result
    await Promise.resolve();

    expect(core.threadIds).toEqual(["fresh"]);
    expect(core.threadIds).not.toContain("stale");
  });

  it("clears loading when the superseded request never settles", async () => {
    const listFn = vi
      .fn<() => Promise<RemoteThreadListResponse>>()
      .mockReturnValueOnce(new Promise<never>(() => {}))
      .mockResolvedValueOnce({
        threads: [
          {
            status: "regular",
            remoteId: "fresh",
            externalId: "fresh",
            title: "Fresh",
          },
        ],
      });
    const adapter = makeAdapter({ list: listFn });
    const core = createCore(adapter);

    void core.getLoadThreadsPromise();
    await core.reload();

    expect(core.threadIds).toEqual(["fresh"]);
    expect(core.isLoading).toBe(false);
  });

  it("clears loading once the fresh list arrives, before the superseded request settles", async () => {
    const first = deferred<RemoteThreadListResponse>();
    const listFn = vi
      .fn<() => Promise<RemoteThreadListResponse>>()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({
        threads: [
          {
            status: "regular",
            remoteId: "fresh",
            externalId: "fresh",
            title: "Fresh",
          },
        ],
      });
    const core = createCore(makeAdapter({ list: listFn }));

    void core.getLoadThreadsPromise();
    await core.reload();

    expect(core.threadIds).toEqual(["fresh"]);
    expect(core.isLoading).toBe(false);

    first.resolve({ threads: [] });
    await Promise.resolve();
    expect(core.isLoading).toBe(false);
  });

  it("recovers after a failed initial load", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const listFn = vi
      .fn<() => Promise<RemoteThreadListResponse>>()
      .mockRejectedValueOnce(new Error("401"))
      .mockResolvedValueOnce({
        threads: [
          {
            status: "regular",
            remoteId: "t-1",
            externalId: "t-1",
            title: "Authed",
          },
        ],
      });
    const adapter = makeAdapter({ list: listFn });
    const core = createCore(adapter);

    await core.getLoadThreadsPromise();
    expect(core.threadIds).toEqual([]);
    expect(core.isLoading).toBe(false);

    await core.reload();
    expect(listFn).toHaveBeenCalledTimes(2);
    expect(core.threadIds).toEqual(["t-1"]);
  });

  it("does not clear the active reload's promise when a stale load rejects", async () => {
    const first = deferred<RemoteThreadListResponse>();
    const second = deferred<RemoteThreadListResponse>();
    const listFn = vi
      .fn<() => Promise<RemoteThreadListResponse>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const adapter = makeAdapter({ list: listFn });
    const core = createCore(adapter);

    core.getLoadThreadsPromise();
    const reloaded = core.reload();

    first.reject(new Error("stale 401"));
    await Promise.resolve();

    second.resolve({
      threads: [
        {
          status: "regular",
          remoteId: "fresh",
          externalId: "fresh",
          title: "Fresh",
        },
      ],
    });

    await reloaded;
    expect(core.threadIds).toEqual(["fresh"]);
    expect(core.isLoading).toBe(false);
  });

  it("only the last of several overlapping reloads wins", async () => {
    const deferreds = [
      deferred<RemoteThreadListResponse>(),
      deferred<RemoteThreadListResponse>(),
      deferred<RemoteThreadListResponse>(),
    ];
    const listFn = vi
      .fn<() => Promise<RemoteThreadListResponse>>()
      .mockImplementationOnce(() => deferreds[0]!.promise)
      .mockImplementationOnce(() => deferreds[1]!.promise)
      .mockImplementationOnce(() => deferreds[2]!.promise);

    const adapter = makeAdapter({ list: listFn });
    const core = createCore(adapter);

    const r1 = core.getLoadThreadsPromise();
    const r2 = core.reload();
    const r3 = core.reload();

    deferreds[2]!.resolve({
      threads: [
        {
          status: "regular",
          remoteId: "c",
          externalId: "c",
          title: "c",
        },
      ],
    });
    await r3;

    deferreds[0]!.resolve({
      threads: [
        {
          status: "regular",
          remoteId: "a",
          externalId: "a",
          title: "a",
        },
      ],
    });
    deferreds[1]!.resolve({
      threads: [
        {
          status: "regular",
          remoteId: "b",
          externalId: "b",
          title: "b",
        },
      ],
    });
    await r1;
    await r2;

    expect(core.threadIds).toEqual(["c"]);
  });

  const dropsSecondThreadOnReload = () => {
    let calls = 0;
    return makeAdapter({
      list: vi.fn(async () => {
        calls++;
        return calls === 1
          ? {
              threads: [
                { status: "regular" as const, remoteId: "t1" },
                { status: "regular" as const, remoteId: "t2" },
              ],
            }
          : {
              threads: [{ status: "regular" as const, remoteId: "t1" }],
              nextCursor: "1",
            };
      }),
    });
  };

  it("stops exposing a thread the reloaded list no longer returns", async () => {
    const adapter = dropsSecondThreadOnReload();
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();
    expect(core.getItemById("t2")?.status).toBe("regular");

    await core.reload();

    expect(core.getItemById("t2")).toBeUndefined();
    expect(Object.keys(core.threadItems)).not.toContain("t2");
    expect(() => new ThreadListRuntimeImpl(core).getItemById("t2")).toThrow();
    await expect(core.archive("t2")).rejects.toThrow(
      'Thread "t2" not found while archiving it.',
    );
    await expect(core.delete("t2")).rejects.toThrow(
      'Thread "t2" not found while deleting it.',
    );
    expect(adapter.archive).not.toHaveBeenCalled();
    expect(adapter.delete).not.toHaveBeenCalled();
    expect(core.archivedThreadIds).toEqual([]);
  });

  it("rejects item actions on a hidden thread while a switch attaches its runtime", async () => {
    let calls = 0;
    const adapter = makeAdapter({
      list: vi.fn(async () => {
        calls++;
        return calls === 1
          ? {
              threads: [
                { status: "regular" as const, remoteId: "t1" },
                { status: "regular" as const, remoteId: "t2" },
                { status: "archived" as const, remoteId: "t3" },
              ],
            }
          : {
              threads: [{ status: "regular" as const, remoteId: "t1" }],
              nextCursor: "1",
            };
      }),
    });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();
    await core.switchToThread("t1");
    await core.reload();

    const hookManager = (
      core as unknown as { _hookManager: RemoteThreadListHookInstanceManager }
    )._hookManager;
    const attached = deferred<unknown>();
    setStartThreadRuntime(core, (id) => {
      void RemoteThreadListHookInstanceManager.prototype.startThreadRuntime
        .call(hookManager, id)
        .catch(() => undefined);
      return attached.promise;
    });
    void core.switchToThread("t3", { unarchive: false });
    const switched = core.switchToThread("t2");

    expect(core.getItemById("t2")?.id).toBe("t2");
    expect(core.getItemById("t3")?.id).toBe("t3");
    expect(Object.keys(core.threadItems)).not.toContain("t2");
    await expect(core.archive("t2")).rejects.toThrow(
      'Thread "t2" not found while archiving it.',
    );
    await expect(core.delete("t2")).rejects.toThrow(
      'Thread "t2" not found while deleting it.',
    );
    await expect(core.unarchive("t3")).rejects.toThrow(
      'Thread "t3" not found while unarchiving it.',
    );
    await expect(
      new ThreadListRuntimeImpl(core).getItemById("t2").archive(),
    ).rejects.toThrow('Thread "t2" not found while archiving it.');
    expect(adapter.archive).not.toHaveBeenCalled();
    expect(adapter.delete).not.toHaveBeenCalled();
    expect(adapter.unarchive).not.toHaveBeenCalled();

    attached.resolve({});
    await switched;

    expect(core.mainThreadId).toBe("t2");
    expect(core.getItemById("t2")?.status).toBe("regular");
    expect(adapter.fetch).not.toHaveBeenCalled();
  });

  it("keeps the runtime and run state of a hidden thread whose runtime is live", async () => {
    const adapter = dropsSecondThreadOnReload();
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();
    const hookManager = (
      core as unknown as { _hookManager: RemoteThreadListHookInstanceManager }
    )._hookManager;
    const internals = hookManager as unknown as {
      instances: Map<string, { generation: number }>;
      _publishThreadRuntime: (
        id: string,
        runtime: ThreadRuntimeCore,
        generation: number,
      ) => void;
    };
    const runtime = {
      isRunning: true,
      subscribe: () => () => {},
      unstable_on: () => () => {},
    } as unknown as ThreadRuntimeCore;
    setStartThreadRuntime(core, async (id) => {
      void RemoteThreadListHookInstanceManager.prototype.startThreadRuntime
        .call(hookManager, id)
        .catch(() => undefined);
      internals._publishThreadRuntime(
        id,
        runtime,
        internals.instances.get(id)!.generation,
      );
      return runtime;
    });
    await core.switchToThread("t2");
    await core.switchToThread("t1");

    await core.reload();

    expect(Object.keys(core.threadItems)).not.toContain("t2");
    expect(core.getThreadRuntimeCore("t2")).toBe(runtime);
    expect(core.unstable_isThreadRunning("t2")).toBe(true);
    expect(core.getItemById("t2")?.id).toBe("t2");
    await expect(core.archive("t2")).rejects.toThrow(
      'Thread "t2" not found while archiving it.',
    );
    expect(adapter.archive).not.toHaveBeenCalled();
  });

  it("still switches to a thread the reloaded list no longer returns without fetching it", async () => {
    const adapter = dropsSecondThreadOnReload();
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();
    await core.reload();

    await core.switchToThread("t2");

    expect(core.mainThreadId).toBe("t2");
    expect(core.getItemById("t2")?.id).toBe("t2");
    expect(adapter.fetch).not.toHaveBeenCalled();
  });
});

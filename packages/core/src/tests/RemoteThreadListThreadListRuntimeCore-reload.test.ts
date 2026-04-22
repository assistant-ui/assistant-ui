import { describe, it, expect, vi } from "vitest";
import { RemoteThreadListThreadListRuntimeCore } from "../react/runtimes/RemoteThreadListThreadListRuntimeCore";
import type {
  RemoteThreadListAdapter,
  RemoteThreadListResponse,
} from "../runtimes/remote-thread-list/types";
import type { ModelContextProvider } from "../model-context/types";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const contextProvider: ModelContextProvider = {
  getModelContext: () => ({}),
  subscribe: () => () => {},
};

function makeAdapter(
  overrides: Partial<RemoteThreadListAdapter> = {},
): RemoteThreadListAdapter {
  return {
    list: vi.fn(async () => ({ threads: [] })),
    initialize: vi.fn(async (threadId: string) => ({
      remoteId: threadId,
      externalId: threadId,
    })),
    rename: vi.fn(async () => {}),
    archive: vi.fn(async () => {}),
    unarchive: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    generateTitle: vi.fn(
      async () =>
        new ReadableStream({
          start(c) {
            c.close();
          },
        }) as never,
    ),
    fetch: vi.fn(async (id: string) => ({
      status: "regular" as const,
      remoteId: id,
      externalId: id,
      title: "Test",
    })),
    ...overrides,
  };
}

function createCore(
  adapter: RemoteThreadListAdapter,
): RemoteThreadListThreadListRuntimeCore {
  const core = new RemoteThreadListThreadListRuntimeCore(
    { adapter, runtimeHook: () => ({}) as never },
    contextProvider,
  );
  (
    core as unknown as {
      _hookManager: {
        startThreadRuntime: (id: string) => Promise<unknown>;
      };
    }
  )._hookManager.startThreadRuntime = async () => ({});
  return core;
}

describe("RemoteThreadListThreadListRuntimeCore.reload", () => {
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

    const initial = core.getLoadThreadsPromise();
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
    await initial;

    expect(core.threadIds).toEqual(["fresh"]);
    expect(core.threadIds).not.toContain("stale");
  });

  it("recovers after a failed initial load", async () => {
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
});

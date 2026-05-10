import { afterEach, describe, it, expect, vi } from "vitest";
import type { RemoteThreadListResponse } from "../runtimes/remote-thread-list/types";
import {
  createCore,
  deferred,
  makeAdapter,
} from "./remote-thread-list-test-helpers";

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
});

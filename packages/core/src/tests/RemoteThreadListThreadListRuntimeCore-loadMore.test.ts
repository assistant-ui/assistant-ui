import { afterEach, describe, it, expect, vi } from "vitest";
import type {
  RemoteThreadListPageOptions,
  RemoteThreadListResponse,
} from "../runtimes/remote-thread-list/types";
import {
  createCore,
  deferred,
  makeAdapter,
} from "./remote-thread-list-test-helpers";

type ListFn = (
  params?: RemoteThreadListPageOptions,
) => Promise<RemoteThreadListResponse>;

describe("RemoteThreadListThreadListRuntimeCore.loadMore", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initial list response with nextCursor sets hasMore=true", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular",
            remoteId: "t-1",
            externalId: "t-1",
            title: "First",
          },
        ],
        nextCursor: "cursor-1",
      })),
    });
    const core = createCore(adapter);

    await core.getLoadThreadsPromise();
    expect(core.threadIds).toEqual(["t-1"]);
    expect(core.hasMore).toBe(true);
  });

  it("absent nextCursor leaves hasMore=false", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular",
            remoteId: "t-1",
            externalId: "t-1",
            title: "Only",
          },
        ],
      })),
    });
    const core = createCore(adapter);

    await core.getLoadThreadsPromise();
    expect(core.hasMore).toBe(false);
  });

  it("loadMore appends the next page and advances the cursor", async () => {
    const listFn = vi
      .fn<ListFn>()
      .mockResolvedValueOnce({
        threads: [
          { status: "regular", remoteId: "p1-a", externalId: "p1-a" },
          { status: "regular", remoteId: "p1-b", externalId: "p1-b" },
        ],
        nextCursor: "c1",
      })
      .mockResolvedValueOnce({
        threads: [
          { status: "regular", remoteId: "p2-a", externalId: "p2-a" },
          { status: "regular", remoteId: "p2-b", externalId: "p2-b" },
        ],
        nextCursor: "c2",
      });
    const adapter = makeAdapter({ list: listFn });
    const core = createCore(adapter);

    await core.getLoadThreadsPromise();
    expect(core.threadIds).toEqual(["p1-a", "p1-b"]);
    expect(core.hasMore).toBe(true);

    await core.loadMore();

    expect(listFn).toHaveBeenNthCalledWith(2, { after: "c1" });
    expect(core.threadIds).toEqual(["p1-a", "p1-b", "p2-a", "p2-b"]);
    expect(core.hasMore).toBe(true);
  });

  it("loadMore without nextCursor flips hasMore to false", async () => {
    const listFn = vi
      .fn<ListFn>()
      .mockResolvedValueOnce({
        threads: [{ status: "regular", remoteId: "a", externalId: "a" }],
        nextCursor: "c1",
      })
      .mockResolvedValueOnce({
        threads: [{ status: "regular", remoteId: "b", externalId: "b" }],
      });
    const adapter = makeAdapter({ list: listFn });
    const core = createCore(adapter);

    await core.getLoadThreadsPromise();
    await core.loadMore();

    expect(core.hasMore).toBe(false);
    expect(core.threadIds).toEqual(["a", "b"]);
  });

  it("loadMore is a no-op when hasMore is false", async () => {
    const listFn = vi.fn<ListFn>().mockResolvedValueOnce({
      threads: [{ status: "regular", remoteId: "a", externalId: "a" }],
    });
    const adapter = makeAdapter({ list: listFn });
    const core = createCore(adapter);

    await core.getLoadThreadsPromise();
    expect(core.hasMore).toBe(false);

    await core.loadMore();
    expect(listFn).toHaveBeenCalledTimes(1);
  });

  it("loadMore is a no-op while the initial list is in flight", async () => {
    const first = deferred<RemoteThreadListResponse>();
    const listFn = vi.fn<ListFn>().mockReturnValueOnce(first.promise);
    const adapter = makeAdapter({ list: listFn });
    const core = createCore(adapter);

    core.getLoadThreadsPromise();
    await core.loadMore();

    expect(listFn).toHaveBeenCalledTimes(1);
    first.resolve({ threads: [] });
  });

  it("concurrent loadMore calls dedupe to a single in-flight request", async () => {
    const first = deferred<RemoteThreadListResponse>();
    const listFn = vi
      .fn<ListFn>()
      .mockResolvedValueOnce({
        threads: [{ status: "regular", remoteId: "a", externalId: "a" }],
        nextCursor: "c1",
      })
      .mockReturnValueOnce(first.promise);
    const adapter = makeAdapter({ list: listFn });
    const core = createCore(adapter);

    await core.getLoadThreadsPromise();

    const p1 = core.loadMore();
    const p2 = core.loadMore();
    expect(listFn).toHaveBeenCalledTimes(2);

    first.resolve({
      threads: [{ status: "regular", remoteId: "b", externalId: "b" }],
    });
    await Promise.all([p1, p2]);

    expect(listFn).toHaveBeenCalledTimes(2);
    expect(core.threadIds).toEqual(["a", "b"]);
  });

  it("drops a stale loadMore when reload bumps the generation mid-flight", async () => {
    const loadMoreCall = deferred<RemoteThreadListResponse>();
    const listFn = vi
      .fn<ListFn>()
      .mockResolvedValueOnce({
        threads: [{ status: "regular", remoteId: "a", externalId: "a" }],
        nextCursor: "c1",
      })
      .mockReturnValueOnce(loadMoreCall.promise)
      .mockResolvedValueOnce({
        threads: [
          { status: "regular", remoteId: "fresh", externalId: "fresh" },
        ],
      });
    const adapter = makeAdapter({ list: listFn });
    const core = createCore(adapter);

    await core.getLoadThreadsPromise();

    const stale = core.loadMore();
    const reloaded = core.reload();

    loadMoreCall.resolve({
      threads: [{ status: "regular", remoteId: "stale", externalId: "stale" }],
      nextCursor: "stale-cursor",
    });
    await Promise.all([stale, reloaded]);

    expect(core.threadIds).toEqual(["fresh"]);
    expect(core.hasMore).toBe(false);
  });

  it("releases the dedup handle after a rejection so retries can proceed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const listFn = vi
      .fn<ListFn>()
      .mockResolvedValueOnce({
        threads: [{ status: "regular", remoteId: "a", externalId: "a" }],
        nextCursor: "c1",
      })
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({
        threads: [{ status: "regular", remoteId: "b", externalId: "b" }],
      });
    const adapter = makeAdapter({ list: listFn });
    const core = createCore(adapter);

    await core.getLoadThreadsPromise();
    await core.loadMore();
    expect(core.threadIds).toEqual(["a"]);
    expect(core.isLoadingMore).toBe(false);

    await core.loadMore();
    expect(core.threadIds).toEqual(["a", "b"]);
  });

  it("dedupes thread ids that appear on more than one page", async () => {
    const listFn = vi
      .fn<ListFn>()
      .mockResolvedValueOnce({
        threads: [{ status: "regular", remoteId: "a", externalId: "a" }],
        nextCursor: "c1",
      })
      .mockResolvedValueOnce({
        threads: [
          { status: "regular", remoteId: "a", externalId: "a" },
          { status: "regular", remoteId: "b", externalId: "b" },
        ],
      });
    const adapter = makeAdapter({ list: listFn });
    const core = createCore(adapter);

    await core.getLoadThreadsPromise();
    await core.loadMore();

    expect(core.threadIds).toEqual(["a", "b"]);
  });

  it("__internal_setOptions clears cursor and dedup handles on adapter swap, then refetches via the new adapter", async () => {
    const firstAdapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular", remoteId: "old", externalId: "old" }],
        nextCursor: "old-cursor",
      })),
    });
    const core = createCore(firstAdapter);
    await core.getLoadThreadsPromise();
    expect(core.threadIds).toEqual(["old"]);
    expect(core.hasMore).toBe(true);

    const secondList = vi.fn(async () => ({
      threads: [{ status: "regular", remoteId: "new", externalId: "new" }],
    }));
    const secondAdapter = makeAdapter({ list: secondList });
    core.__internal_setOptions({
      adapter: secondAdapter,
      runtimeHook: () => ({}) as never,
    });

    expect(core.hasMore).toBe(false);
    expect(core.threadIds).toEqual(["old"]);

    await core.getLoadThreadsPromise();
    expect(secondList).toHaveBeenCalledTimes(1);
    expect(core.threadIds).toEqual(["new"]);
  });

  it("ignores an in-flight loadMore response when the adapter swaps mid-flight", async () => {
    const slow = deferred<RemoteThreadListResponse>();
    const firstList = vi
      .fn<
        (
          params?: RemoteThreadListPageOptions,
        ) => Promise<RemoteThreadListResponse>
      >()
      .mockResolvedValueOnce({
        threads: [{ status: "regular", remoteId: "p1", externalId: "p1" }],
        nextCursor: "c1",
      })
      .mockReturnValueOnce(slow.promise);
    const firstAdapter = makeAdapter({ list: firstList });
    const core = createCore(firstAdapter);

    await core.getLoadThreadsPromise();
    const stale = core.loadMore();

    const secondAdapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular", remoteId: "ignored", externalId: "x" }],
      })),
    });
    core.__internal_setOptions({
      adapter: secondAdapter,
      runtimeHook: () => ({}) as never,
    });

    slow.resolve({
      threads: [{ status: "regular", remoteId: "stale", externalId: "stale" }],
      nextCursor: "stale-cursor",
    });
    await stale;

    expect(core.threadIds).toEqual(["p1"]);
    expect(core.hasMore).toBe(false);
    expect(core.isLoadingMore).toBe(false);
  });

  it("drops the in-flight initial list when the adapter swaps mid-flight", async () => {
    const slow = deferred<RemoteThreadListResponse>();
    const firstList = vi.fn<ListFn>().mockReturnValueOnce(slow.promise);
    const firstAdapter = makeAdapter({ list: firstList });
    const core = createCore(firstAdapter);

    core.getLoadThreadsPromise();

    const secondList = vi.fn<ListFn>().mockResolvedValueOnce({
      threads: [{ status: "regular", remoteId: "fresh", externalId: "fresh" }],
    });
    const secondAdapter = makeAdapter({ list: secondList });
    core.__internal_setOptions({
      adapter: secondAdapter,
      runtimeHook: () => ({}) as never,
    });

    slow.resolve({
      threads: [{ status: "regular", remoteId: "stale", externalId: "stale" }],
      nextCursor: "stale-cursor",
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(core.threadIds).toEqual([]);
    expect(core.hasMore).toBe(false);

    await core.getLoadThreadsPromise();
    expect(secondList).toHaveBeenCalledTimes(1);
    expect(core.threadIds).toEqual(["fresh"]);
  });

  it("dedupes thread ids that appear twice within a single page", async () => {
    const listFn = vi
      .fn<ListFn>()
      .mockResolvedValueOnce({
        threads: [{ status: "regular", remoteId: "a", externalId: "a" }],
        nextCursor: "c1",
      })
      .mockResolvedValueOnce({
        threads: [
          { status: "regular", remoteId: "b", externalId: "b" },
          { status: "regular", remoteId: "b", externalId: "b" },
        ],
      });
    const adapter = makeAdapter({ list: listFn });
    const core = createCore(adapter);

    await core.getLoadThreadsPromise();
    await core.loadMore();

    expect(core.threadIds).toEqual(["a", "b"]);
  });

  it("treats an empty-string nextCursor as no more pages", async () => {
    const listFn = vi.fn<ListFn>().mockResolvedValueOnce({
      threads: [{ status: "regular", remoteId: "a", externalId: "a" }],
      nextCursor: "",
    });
    const adapter = makeAdapter({ list: listFn });
    const core = createCore(adapter);

    await core.getLoadThreadsPromise();
    expect(core.hasMore).toBe(false);

    await core.loadMore();
    expect(listFn).toHaveBeenCalledTimes(1);
  });

  it("does not advance the cursor when the reducer rejects an unknown thread status", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const listFn = vi
      .fn<ListFn>()
      .mockResolvedValueOnce({
        threads: [{ status: "regular", remoteId: "a", externalId: "a" }],
        nextCursor: "c1",
      })
      .mockResolvedValueOnce({
        threads: [
          {
            status: "weird" as unknown as "regular",
            remoteId: "bad",
            externalId: "bad",
          },
        ],
        nextCursor: "c2",
      })
      .mockResolvedValueOnce({
        threads: [
          { status: "regular", remoteId: "retry", externalId: "retry" },
        ],
      });
    const adapter = makeAdapter({ list: listFn });
    const core = createCore(adapter);

    await core.getLoadThreadsPromise();
    expect(core.hasMore).toBe(true);

    await core.loadMore();

    expect(core.threadIds).toEqual(["a"]);
    expect(core.hasMore).toBe(true);
    expect(core.isLoadingMore).toBe(false);

    await core.loadMore();
    expect(listFn).toHaveBeenNthCalledWith(2, { after: "c1" });
    expect(listFn).toHaveBeenNthCalledWith(3, { after: "c1" });
    expect(core.threadIds).toEqual(["a", "retry"]);
  });

  it("reload resets cursor and hasMore so loadMore becomes a no-op", async () => {
    const listFn = vi
      .fn<ListFn>()
      .mockResolvedValueOnce({
        threads: [{ status: "regular", remoteId: "a", externalId: "a" }],
        nextCursor: "c1",
      })
      .mockResolvedValueOnce({
        threads: [
          { status: "regular", remoteId: "fresh", externalId: "fresh" },
        ],
      });
    const adapter = makeAdapter({ list: listFn });
    const core = createCore(adapter);

    await core.getLoadThreadsPromise();
    expect(core.hasMore).toBe(true);

    await core.reload();
    expect(core.hasMore).toBe(false);
    expect(core.threadIds).toEqual(["fresh"]);

    await core.loadMore();
    expect(listFn).toHaveBeenCalledTimes(2);
  });
});

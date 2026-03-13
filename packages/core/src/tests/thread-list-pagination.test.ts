import { describe, it, expect, vi } from "vitest";
import { RemoteThreadListThreadListRuntimeCore } from "../react/runtimes/RemoteThreadListThreadListRuntimeCore";
import type {
  RemoteThreadListAdapter,
  RemoteThreadListResponse,
} from "../runtimes/remote-thread-list/types";
import type { ModelContextProvider } from "../model-context/types";

const makeThread = (
  id: string,
  status: "regular" | "archived" = "regular",
) => ({
  remoteId: id,
  status,
  title: `Thread ${id}`,
});

const createMockAdapter = (
  listFn: RemoteThreadListAdapter["list"],
): RemoteThreadListAdapter => ({
  list: listFn,
  rename: vi.fn(),
  archive: vi.fn(),
  unarchive: vi.fn(),
  delete: vi.fn(),
  initialize: vi
    .fn()
    .mockResolvedValue({ remoteId: "r", externalId: undefined }),
  generateTitle: vi.fn(),
  fetch: vi.fn(),
});

const mockContextProvider: ModelContextProvider = {
  getModelContext: () => ({
    system: undefined,
    tools: {},
    callSettings: {},
    config: {},
  }),
};

const mockRuntimeHook = (() => ({})) as any;

const createCore = (adapter: RemoteThreadListAdapter) =>
  new RemoteThreadListThreadListRuntimeCore(
    { runtimeHook: mockRuntimeHook, adapter },
    mockContextProvider,
  );

describe("ThreadList pagination", () => {
  describe("canLoadMore", () => {
    it("is false before initial load", () => {
      const adapter = createMockAdapter(async () => ({
        threads: [makeThread("t1")],
      }));
      const core = createCore(adapter);
      expect(core.canLoadMore).toBe(false);
    });

    it("is true when list returns a cursor", async () => {
      const adapter = createMockAdapter(async () => ({
        threads: [makeThread("t1")],
        cursor: "page2",
      }));
      const core = createCore(adapter);
      await core.getLoadThreadsPromise();

      expect(core.canLoadMore).toBe(true);
    });

    it("is false when list returns no cursor", async () => {
      const adapter = createMockAdapter(async () => ({
        threads: [makeThread("t1")],
      }));
      const core = createCore(adapter);
      await core.getLoadThreadsPromise();

      expect(core.canLoadMore).toBe(false);
    });
  });

  describe("loadMore", () => {
    it("appends threads from the next page", async () => {
      const listFn = vi.fn<RemoteThreadListAdapter["list"]>();
      listFn.mockResolvedValueOnce({
        threads: [makeThread("t1"), makeThread("t2")],
        cursor: "page2",
      });
      listFn.mockResolvedValueOnce({
        threads: [makeThread("t3"), makeThread("t4")],
        cursor: "page3",
      });

      const core = createCore(createMockAdapter(listFn));
      await core.getLoadThreadsPromise();

      expect(core.threadIds).toEqual(["t1", "t2"]);

      await core.loadMore();

      expect(core.threadIds).toEqual(["t1", "t2", "t3", "t4"]);
      expect(core.canLoadMore).toBe(true);
    });

    it("passes cursor to adapter.list", async () => {
      const listFn = vi.fn<RemoteThreadListAdapter["list"]>();
      listFn.mockResolvedValueOnce({
        threads: [makeThread("t1")],
        cursor: "cursor-abc",
      });
      listFn.mockResolvedValueOnce({
        threads: [makeThread("t2")],
      });

      const core = createCore(createMockAdapter(listFn));
      await core.getLoadThreadsPromise();
      await core.loadMore();

      expect(listFn).toHaveBeenCalledTimes(2);
      expect(listFn).toHaveBeenNthCalledWith(1);
      expect(listFn).toHaveBeenNthCalledWith(2, { cursor: "cursor-abc" });
    });

    it("is a no-op when canLoadMore is false", async () => {
      const listFn = vi.fn<RemoteThreadListAdapter["list"]>();
      listFn.mockResolvedValueOnce({
        threads: [makeThread("t1")],
      });

      const core = createCore(createMockAdapter(listFn));
      await core.getLoadThreadsPromise();
      await core.loadMore();

      expect(listFn).toHaveBeenCalledTimes(1);
    });

    it("sets canLoadMore to false when last page has no cursor", async () => {
      const listFn = vi.fn<RemoteThreadListAdapter["list"]>();
      listFn.mockResolvedValueOnce({
        threads: [makeThread("t1")],
        cursor: "page2",
      });
      listFn.mockResolvedValueOnce({
        threads: [makeThread("t2")],
      });

      const core = createCore(createMockAdapter(listFn));
      await core.getLoadThreadsPromise();
      expect(core.canLoadMore).toBe(true);

      await core.loadMore();
      expect(core.canLoadMore).toBe(false);
    });

    it("appends archived threads correctly", async () => {
      const listFn = vi.fn<RemoteThreadListAdapter["list"]>();
      listFn.mockResolvedValueOnce({
        threads: [makeThread("t1"), makeThread("a1", "archived")],
        cursor: "page2",
      });
      listFn.mockResolvedValueOnce({
        threads: [makeThread("t2"), makeThread("a2", "archived")],
      });

      const core = createCore(createMockAdapter(listFn));
      await core.getLoadThreadsPromise();

      expect(core.threadIds).toEqual(["t1"]);
      expect(core.archivedThreadIds).toEqual(["a1"]);

      await core.loadMore();

      expect(core.threadIds).toEqual(["t1", "t2"]);
      expect(core.archivedThreadIds).toEqual(["a1", "a2"]);
    });
  });

  describe("deduplication", () => {
    it("skips threads already present when appending", async () => {
      const listFn = vi.fn<RemoteThreadListAdapter["list"]>();
      listFn.mockResolvedValueOnce({
        threads: [makeThread("t1"), makeThread("t2")],
        cursor: "page2",
      });
      listFn.mockResolvedValueOnce({
        threads: [makeThread("t2"), makeThread("t3")],
      });

      const core = createCore(createMockAdapter(listFn));
      await core.getLoadThreadsPromise();
      await core.loadMore();

      expect(core.threadIds).toEqual(["t1", "t2", "t3"]);
    });
  });

  describe("concurrent loadMore calls", () => {
    it("deduplicates in-flight requests", async () => {
      let resolveList: (value: RemoteThreadListResponse) => void;
      const listFn = vi.fn<RemoteThreadListAdapter["list"]>();
      listFn.mockResolvedValueOnce({
        threads: [makeThread("t1")],
        cursor: "page2",
      });
      listFn.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveList = resolve;
          }),
      );

      const core = createCore(createMockAdapter(listFn));
      await core.getLoadThreadsPromise();

      const promise1 = core.loadMore();
      const promise2 = core.loadMore();

      resolveList!({ threads: [makeThread("t2")] });
      await promise1;
      await promise2;

      expect(listFn).toHaveBeenCalledTimes(2);
      expect(core.threadIds).toEqual(["t1", "t2"]);
    });
  });

  describe("initial load failure retry", () => {
    it("allows retry after initial load fails", async () => {
      const listFn = vi.fn<RemoteThreadListAdapter["list"]>();
      listFn.mockRejectedValueOnce(new Error("network error"));
      listFn.mockResolvedValueOnce({
        threads: [makeThread("t1")],
      });

      const core = createCore(createMockAdapter(listFn));

      await core.getLoadThreadsPromise();

      await core.getLoadThreadsPromise();

      expect(listFn).toHaveBeenCalledTimes(2);
      expect(core.threadIds).toEqual(["t1"]);
    });
  });
});

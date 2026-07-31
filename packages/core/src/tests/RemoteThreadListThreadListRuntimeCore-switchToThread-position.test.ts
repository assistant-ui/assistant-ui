import { describe, it, expect, vi } from "vitest";
import type {
  RemoteThreadListResponse,
  RemoteThreadMetadata,
} from "../runtimes/remote-thread-list/types";
import {
  createCore,
  deferred,
  makeAdapter,
} from "./remote-thread-list-test-helpers";

const thread = (id: string): RemoteThreadMetadata => ({
  status: "regular",
  remoteId: id,
  externalId: id,
  title: id,
});

const archivedThread = (id: string): RemoteThreadMetadata => ({
  status: "archived",
  remoteId: id,
  externalId: id,
  title: id,
});

describe("RemoteThreadListThreadListRuntimeCore.switchToThread position", () => {
  it("keeps the position a concurrent list() already gave the thread", async () => {
    const TARGET = "thread-target";
    const listDeferred = deferred<RemoteThreadListResponse>();
    const fetchDeferred = deferred<RemoteThreadMetadata>();

    const adapter = makeAdapter({
      list: vi.fn(() => listDeferred.promise),
      fetch: vi.fn(() => fetchDeferred.promise),
    });

    const core = createCore(adapter, TARGET);

    const loadPromise = core.getLoadThreadsPromise();
    const switchPromise = core.switchToThread(TARGET);

    // `list()` resolves first and places TARGET at the top, as the most recent.
    listDeferred.resolve({
      threads: [thread(TARGET), thread("thread-a"), thread("thread-b")],
    });
    await loadPromise;

    expect(core.threadIds).toEqual([TARGET, "thread-a", "thread-b"]);

    fetchDeferred.resolve(thread(TARGET));
    await switchPromise;

    // The fetch path must not filter TARGET out of position and re-append it.
    expect(core.threadIds).toEqual([TARGET, "thread-a", "thread-b"]);
  });

  it("appends a thread that is genuinely absent from the loaded list", async () => {
    const TARGET = "thread-target";
    const listDeferred = deferred<RemoteThreadListResponse>();
    const fetchDeferred = deferred<RemoteThreadMetadata>();

    const adapter = makeAdapter({
      list: vi.fn(() => listDeferred.promise),
      fetch: vi.fn(() => fetchDeferred.promise),
    });

    const core = createCore(adapter, TARGET);

    const loadPromise = core.getLoadThreadsPromise();
    const switchPromise = core.switchToThread(TARGET);

    // `list()` resolves first but does not include TARGET (e.g. it is past the
    // first page).
    listDeferred.resolve({
      threads: [thread("thread-a"), thread("thread-b")],
    });
    await loadPromise;

    expect(core.threadIds).toEqual(["thread-a", "thread-b"]);

    fetchDeferred.resolve(thread(TARGET));
    await switchPromise;

    // An absent thread may live on an unloaded page; appending keeps it below
    // every loaded (newer) thread instead of pinning it to the top.
    expect(core.threadIds).toEqual(["thread-a", "thread-b", TARGET]);
  });

  it("keeps the position a concurrent list() gave an archived thread", async () => {
    const TARGET = "thread-target";
    const listDeferred = deferred<RemoteThreadListResponse>();
    const fetchDeferred = deferred<RemoteThreadMetadata>();

    const adapter = makeAdapter({
      list: vi.fn(() => listDeferred.promise),
      fetch: vi.fn(() => fetchDeferred.promise),
    });

    const core = createCore(adapter, TARGET);
    // Stub unarchive so auto-unarchive doesn't move the thread into `threadIds`
    // via `updateStatusReducer`, hiding the position written by the fetch path.
    (
      core as unknown as { unarchive: (id: string) => Promise<void> }
    ).unarchive = async () => {};

    const loadPromise = core.getLoadThreadsPromise();
    const switchPromise = core.switchToThread(TARGET);

    listDeferred.resolve({
      threads: [archivedThread(TARGET), archivedThread("thread-a")],
    });
    await loadPromise;

    expect(core.archivedThreadIds).toEqual([TARGET, "thread-a"]);

    fetchDeferred.resolve(archivedThread(TARGET));
    await switchPromise;

    expect(core.archivedThreadIds).toEqual([TARGET, "thread-a"]);
  });
});

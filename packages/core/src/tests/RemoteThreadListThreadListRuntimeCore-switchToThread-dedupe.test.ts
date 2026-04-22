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

describe("RemoteThreadListThreadListRuntimeCore.switchToThread dedupe", () => {
  it("does not duplicate threadIds when list() resolves during fetch()", async () => {
    const THREAD_ID = "thread-1";
    const listDeferred = deferred<RemoteThreadListResponse>();
    const fetchDeferred = deferred<RemoteThreadMetadata>();

    const adapter = makeAdapter({
      list: vi.fn(() => listDeferred.promise),
      fetch: vi.fn(() => fetchDeferred.promise),
    });

    const core = createCore(adapter, THREAD_ID);

    const loadPromise = core.getLoadThreadsPromise();
    const switchPromise = core.switchToThread(THREAD_ID);

    // Commit `list()` before resolving `fetch()` so `switchToThread` reads a
    // state that already contains THREAD_ID.
    listDeferred.resolve({
      threads: [
        {
          status: "regular",
          remoteId: THREAD_ID,
          externalId: THREAD_ID,
          title: "Test",
        },
      ],
    });
    await loadPromise;

    fetchDeferred.resolve({
      status: "regular",
      remoteId: THREAD_ID,
      externalId: THREAD_ID,
      title: "Test",
    });
    await switchPromise;

    expect(core.threadIds.filter((id) => id === THREAD_ID)).toEqual([
      THREAD_ID,
    ]);
  });

  it("does not duplicate archivedThreadIds when list() resolves during fetch()", async () => {
    const THREAD_ID = "archived-1";
    const listDeferred = deferred<RemoteThreadListResponse>();
    const fetchDeferred = deferred<RemoteThreadMetadata>();

    const adapter = makeAdapter({
      list: vi.fn(() => listDeferred.promise),
      fetch: vi.fn(() => fetchDeferred.promise),
    });

    const core = createCore(adapter, THREAD_ID);
    // Without this stub, auto-unarchive would filter `archivedThreadIds` via
    // `updateStatusReducer`, hiding any duplicate written by `switchToThread`.
    (
      core as unknown as { unarchive: (id: string) => Promise<void> }
    ).unarchive = async () => {};

    const loadPromise = core.getLoadThreadsPromise();
    const switchPromise = core.switchToThread(THREAD_ID);

    listDeferred.resolve({
      threads: [
        {
          status: "archived",
          remoteId: THREAD_ID,
          externalId: THREAD_ID,
          title: "Archived",
        },
      ],
    });
    await loadPromise;

    fetchDeferred.resolve({
      status: "archived",
      remoteId: THREAD_ID,
      externalId: THREAD_ID,
      title: "Archived",
    });
    await switchPromise;

    expect(core.archivedThreadIds.filter((id) => id === THREAD_ID)).toEqual([
      THREAD_ID,
    ]);
  });

  it("moves the id to the correct array when list() and fetch() disagree on status", async () => {
    const THREAD_ID = "flipped-1";
    const listDeferred = deferred<RemoteThreadListResponse>();
    const fetchDeferred = deferred<RemoteThreadMetadata>();

    const adapter = makeAdapter({
      list: vi.fn(() => listDeferred.promise),
      fetch: vi.fn(() => fetchDeferred.promise),
    });

    const core = createCore(adapter, THREAD_ID);

    const loadPromise = core.getLoadThreadsPromise();
    const switchPromise = core.switchToThread(THREAD_ID);

    // A concurrent unarchive between `list()` and `fetch()` flips the status.
    listDeferred.resolve({
      threads: [
        {
          status: "archived",
          remoteId: THREAD_ID,
          externalId: THREAD_ID,
          title: "Flipped",
        },
      ],
    });
    await loadPromise;

    fetchDeferred.resolve({
      status: "regular",
      remoteId: THREAD_ID,
      externalId: THREAD_ID,
      title: "Flipped",
    });
    await switchPromise;

    expect(core.threadIds).toContain(THREAD_ID);
    expect(core.archivedThreadIds).not.toContain(THREAD_ID);
  });
});

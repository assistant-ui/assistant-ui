import { describe, it, expect, vi } from "vitest";
import type { RemoteThreadMetadata } from "../runtimes/remote-thread-list/types";
import {
  createCore,
  deferred,
  makeAdapter,
} from "./remote-thread-list-test-helpers";

describe("RemoteThreadListThreadListRuntimeCore.switchToThread fetch merge", () => {
  it("rolls back an archive that fails after a fetched thread was merged", async () => {
    const archiveDeferred = deferred<void>();
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1" }],
      })),
      archive: vi.fn(() => archiveDeferred.promise),
    });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();

    const archivePromise = core.archive("t1");
    await vi.waitFor(() => {
      expect(core.archivedThreadIds).toEqual(["t1"]);
    });

    await core.switchToThread("t2");
    expect(core.mainThreadId).toBe("t2");

    archiveDeferred.reject(new Error("archive failed"));
    await expect(archivePromise).rejects.toThrow("archive failed");

    expect(core.getItemById("t1")?.status).toBe("regular");
    expect(core.threadIds).toEqual(["t1", "t2"]);
    expect(core.archivedThreadIds).toEqual([]);
  });

  it("merges into the slot that initialized under the fetched remote id", async () => {
    const initializeDeferred = deferred<{
      remoteId: string;
      externalId: string;
    }>();
    const fetchDeferred = deferred<RemoteThreadMetadata>();
    const adapter = makeAdapter({
      initialize: vi.fn(() => initializeDeferred.promise),
      fetch: vi.fn(() => fetchDeferred.promise),
    });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();
    await core.switchToNewThread();

    const localId = core.newThreadId!;
    const initializePromise = core.initialize(localId);
    const switchPromise = core.switchToThread("remote-1");

    initializeDeferred.resolve({
      remoteId: "remote-1",
      externalId: "remote-1",
    });
    await initializePromise;
    fetchDeferred.resolve({
      status: "regular",
      remoteId: "remote-1",
      title: "Fetched",
    });
    await switchPromise;

    expect(Object.keys(core.threadItems)).toEqual([localId]);
    expect(core.threadIds).toEqual([localId]);
    expect(core.getItemById("remote-1")).toMatchObject({
      id: localId,
      title: "Fetched",
    });
    expect(core.mainThreadId).toBe(localId);
  });

  it("keeps a thread deleted while its fetch was in flight deleted", async () => {
    const fetchDeferred = deferred<RemoteThreadMetadata>();
    const listDeferred = deferred<{
      threads: { status: "regular"; remoteId: string }[];
    }>();
    const adapter = makeAdapter({
      list: vi.fn(() => listDeferred.promise),
      fetch: vi.fn(() => fetchDeferred.promise),
    });
    const core = createCore(adapter);
    const loadPromise = core.getLoadThreadsPromise();
    const switchPromise = core.switchToThread("t1");

    listDeferred.resolve({ threads: [{ status: "regular", remoteId: "t1" }] });
    await loadPromise;
    await core.delete("t1");

    fetchDeferred.resolve({ status: "regular", remoteId: "t1" });
    await switchPromise.catch(() => {});

    expect(core.getItemById("t1")).toBeUndefined();
    expect(core.mainThreadId).not.toBe("t1");
  });

  it("keeps a thread archived while its fetch was in flight in step with the adapter", async () => {
    const fetchDeferred = deferred<RemoteThreadMetadata>();
    const listDeferred = deferred<{
      threads: { status: "regular"; remoteId: string }[];
    }>();
    const adapter = makeAdapter({
      list: vi.fn(() => listDeferred.promise),
      fetch: vi.fn(() => fetchDeferred.promise),
    });
    const core = createCore(adapter);
    const loadPromise = core.getLoadThreadsPromise();
    const switchPromise = core.switchToThread("t1");

    listDeferred.resolve({ threads: [{ status: "regular", remoteId: "t1" }] });
    await loadPromise;
    await core.archive("t1");

    fetchDeferred.resolve({ status: "regular", remoteId: "t1" });
    await switchPromise;

    // Switching to an archived thread unarchives it through the adapter.
    expect(core.getItemById("t1")?.status).toBe("regular");
    expect(adapter.unarchive).toHaveBeenCalledWith("t1");
  });
});

import { describe, expect, it, vi } from "vitest";
import type { RemoteThreadMetadata } from "../runtimes/remote-thread-list/types";
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

describe("RemoteThreadListThreadListRuntimeCore.switchToThread order", () => {
  it("preserves the latest switch when an earlier fetch resolves last", async () => {
    const fetchB = deferred<RemoteThreadMetadata>();
    const fetchC = deferred<RemoteThreadMetadata>();
    const adapter = makeAdapter({
      fetch: vi.fn((id: string) =>
        id === "thread-b" ? fetchB.promise : fetchC.promise,
      ),
    });
    const core = createCore(adapter);

    const switchToB = core.switchToThread("thread-b");
    const switchToC = core.switchToThread("thread-c");

    fetchC.resolve(thread("thread-c"));
    await switchToC;
    fetchB.resolve(thread("thread-b"));
    await switchToB;

    expect(core.mainThreadId).toBe(core.getItemById("thread-c")?.id);
  });

  it("preserves the latest switch when an earlier runtime starts last", async () => {
    const runtimeB = deferred<unknown>();
    const runtimeC = deferred<unknown>();
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [thread("thread-b"), thread("thread-c")],
      })),
    });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();

    (
      core as unknown as {
        _hookManager: {
          startThreadRuntime: (id: string) => Promise<unknown>;
        };
      }
    )._hookManager.startThreadRuntime = (id) =>
      id === core.getItemById("thread-b")?.id
        ? runtimeB.promise
        : runtimeC.promise;

    const switchToB = core.switchToThread("thread-b");
    const switchToC = core.switchToThread("thread-c");

    runtimeC.resolve({});
    await switchToC;
    runtimeB.resolve({});
    await switchToB;

    expect(core.mainThreadId).toBe(core.getItemById("thread-c")?.id);
  });

  it("invalidates an earlier switch while a new thread request is pending", async () => {
    const initializeThread = deferred<{
      remoteId: string;
      externalId: string;
    }>();
    const runtimeB = deferred<unknown>();
    const adapter = makeAdapter({
      initialize: vi.fn(() => initializeThread.promise),
      list: vi.fn(async () => ({ threads: [thread("thread-b")] })),
    });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();

    const initialNewThreadId = core.newThreadId;
    if (!initialNewThreadId) throw new Error("Expected an initial new thread");

    const threadBId = core.getItemById("thread-b")?.id;
    (
      core as unknown as {
        _hookManager: {
          startThreadRuntime: (id: string) => Promise<unknown>;
        };
      }
    )._hookManager.startThreadRuntime = (id) =>
      id === threadBId ? runtimeB.promise : Promise.resolve({});

    const initialize = core.initialize(initialNewThreadId);
    const switchToB = core.switchToThread("thread-b");
    const switchToNewThread = core.switchToNewThread();

    runtimeB.resolve({});
    await switchToB;

    expect(core.mainThreadId).not.toBe(threadBId);

    initializeThread.resolve({
      remoteId: "initialized-thread",
      externalId: "initialized-thread",
    });
    await initialize;
    await switchToNewThread;

    expect(core.mainThreadId).toBe(core.getItemById(core.newThreadId!)?.id);
  });

  it("does not let a pending new thread request override a later switch", async () => {
    const initializeThread = deferred<{
      remoteId: string;
      externalId: string;
    }>();
    const adapter = makeAdapter({
      initialize: vi.fn(() => initializeThread.promise),
      list: vi.fn(async () => ({ threads: [thread("thread-c")] })),
    });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();

    const initialNewThreadId = core.newThreadId;
    if (!initialNewThreadId) throw new Error("Expected an initial new thread");

    const initialize = core.initialize(initialNewThreadId);
    const switchToNewThread = core.switchToNewThread();
    await core.switchToThread("thread-c");

    initializeThread.resolve({
      remoteId: "initialized-thread",
      externalId: "initialized-thread",
    });
    await initialize;
    await switchToNewThread;

    expect(core.mainThreadId).toBe(core.getItemById("thread-c")?.id);
  });

  it("keeps mutations waiting when a newer switch fails", async () => {
    const fetchB = deferred<RemoteThreadMetadata>();
    const newThreadRuntime = deferred<unknown>();
    const adapter = makeAdapter({
      fetch: vi.fn(() => fetchB.promise),
      list: vi.fn(async () => ({ threads: [thread("thread-a")] })),
    });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();
    await core.switchToThread("thread-a");

    const threadAId = core.getItemById("thread-a")?.id;
    const newThreadId = core.newThreadId;
    if (!newThreadId) throw new Error("Expected an initial new thread");

    (
      core as unknown as {
        _hookManager: {
          startThreadRuntime: (id: string) => Promise<unknown>;
        };
      }
    )._hookManager.startThreadRuntime = (id) =>
      id === core.getItemById(newThreadId)?.id
        ? newThreadRuntime.promise
        : Promise.resolve({});

    const deleteA = core.delete("thread-a");
    const switchToB = core.switchToThread("thread-b");
    const switchToBResult = expect(switchToB).rejects.toThrow("fetch failed");

    newThreadRuntime.resolve({});
    fetchB.reject(new Error("fetch failed"));

    await switchToBResult;
    await deleteA;

    expect(core.mainThreadId).not.toBe(threadAId);
    expect(core.mainThreadId).toBe(core.getItemById(core.newThreadId!)?.id);
  });

  it("lets a newer successful switch move the mutation target away", async () => {
    const fetchB = deferred<RemoteThreadMetadata>();
    const newThreadRuntime = deferred<unknown>();
    const adapter = makeAdapter({
      fetch: vi.fn(() => fetchB.promise),
      list: vi.fn(async () => ({ threads: [thread("thread-a")] })),
    });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();
    await core.switchToThread("thread-a");

    const newThreadId = core.newThreadId;
    if (!newThreadId) throw new Error("Expected an initial new thread");

    (
      core as unknown as {
        _hookManager: {
          startThreadRuntime: (id: string) => Promise<unknown>;
        };
      }
    )._hookManager.startThreadRuntime = (id) =>
      id === core.getItemById(newThreadId)?.id
        ? newThreadRuntime.promise
        : Promise.resolve({});

    const deleteA = core.delete("thread-a");
    const switchToB = core.switchToThread("thread-b");

    newThreadRuntime.resolve({});
    fetchB.resolve(thread("thread-b"));

    await switchToB;
    await deleteA;

    expect(core.mainThreadId).toBe(core.getItemById("thread-b")?.id);
  });
});

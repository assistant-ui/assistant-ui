import { describe, expect, it, vi } from "vitest";
import { flushTapSync, resource } from "@assistant-ui/tap";
import { AuiConfig, createAssistantClient } from "@assistant-ui/store/client";
import type { RemoteThreadListAdapter } from "../../runtimes/remote-thread-list/types";
import { RemoteThreadList } from "./RemoteThreadList";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const yieldTasks = async (count = 5) => {
  for (let i = 0; i < count; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
};

const threadState = { isRunning: false, messages: [] };
const composer = { getState: () => ({}) };
const suggestions = { getState: () => ({ suggestions: [] }) };
const StubThread = resource(() => ({
  getState: () => threadState,
  composer: () => composer,
  suggestions: () => suggestions,
}));

const runMergedQueueArchive = async (archiveDraft: boolean) => {
  const server: Record<string, "regular" | "archived"> = { r0: "regular" };
  const calls: string[] = [];
  const list = deferred<{
    threads: {
      remoteId: string;
      status: "regular" | "archived";
      title: string;
    }[];
  }>();
  const initialization = deferred<{ remoteId: string; externalId: string }>();
  const unarchiveGate = deferred<void>();
  const adapter: RemoteThreadListAdapter = {
    list: vi.fn(() => list.promise),
    initialize: vi.fn(async () => {
      calls.push("initialize");
      server.r1 = "regular";
      return initialization.promise;
    }),
    rename: vi.fn(async () => {}),
    archive: vi.fn(async (id: string) => {
      calls.push(`archive ${id}`);
      server[id] = "archived";
    }),
    unarchive: vi.fn(async (id: string) => {
      calls.push(`unarchive ${id}`);
      await unarchiveGate.promise;
      server[id] = "regular";
    }),
    delete: vi.fn(async () => {}),
    fetch: vi.fn(async (id: string) => ({
      remoteId: id,
      status:
        server[id] === "archived"
          ? ("archived" as const)
          : ("regular" as const),
    })),
    generateTitle: vi.fn(async () => new ReadableStream() as never),
  };
  const handle = createAssistantClient(
    AuiConfig({
      threads: RemoteThreadList({
        adapter,
        thread: () => StubThread() as never,
      }),
    }),
  );
  handle.subscribe(() => {});
  const threads = handle.getClient().threads;
  try {
    const draft = threads.getState().mainThreadId;
    const initializing = threads.item({ id: draft }).initialize();
    await vi.waitFor(() => expect(calls).toEqual(["initialize"]));
    list.resolve({
      threads: [
        { remoteId: "r1", status: "regular", title: "r1" },
        { remoteId: "r0", status: "regular", title: "r0" },
      ],
    });
    await threads.getLoadThreadsPromise();
    await vi.waitFor(() => {
      expect(threads.getState().threadIds).toContain("r1");
    });

    const draftArchive = archiveDraft
      ? threads.item({ id: draft }).archive()
      : undefined;
    await yieldTasks();
    await threads.item({ id: "r1" }).archive();
    await vi.waitFor(() => {
      expect(threads.item({ id: "r1" }).getState().status).toBe("archived");
    });
    const switched = threads.switchToThread("r1");
    await vi.waitFor(() => expect(calls).toContain("unarchive r1"));
    initialization.resolve({ remoteId: "r1", externalId: "r1" });
    await initializing;
    unarchiveGate.resolve();
    await Promise.all([draftArchive, switched]);
    await yieldTasks(20);
    flushTapSync(() => {});

    const state = threads.getState();
    const shown = [...state.threadIds, ...state.archivedThreadIds]
      .map((id) => threads.item({ id }).getState())
      .filter((thread) => thread.remoteId === "r1")
      .map((thread) => thread.status);
    return { shown, server: server.r1, calls };
  } finally {
    unarchiveGate.resolve();
    initialization.resolve({ remoteId: "r1", externalId: "r1" });
    list.resolve({ threads: [] });
    handle.destroy();
  }
};

describe("RemoteThreadList initialize queue merge", () => {
  it("keeps the thread archived when initialize merges an in-flight unarchive behind a later archive", async () => {
    const result = await runMergedQueueArchive(true);
    expect(result).toEqual({
      shown: ["archived"],
      server: "archived",
      calls: ["initialize", "archive r1", "unarchive r1", "archive r1"],
    });
  });

  it("keeps the thread regular when initialize merges without the draft archive", async () => {
    const result = await runMergedQueueArchive(false);
    expect(result).toEqual({
      shown: ["regular"],
      server: "regular",
      calls: ["initialize", "archive r1", "unarchive r1"],
    });
  });
});

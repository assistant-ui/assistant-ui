import { describe, it, expect, vi } from "vitest";
import { createCore, makeAdapter } from "./remote-thread-list-test-helpers";

const archivedThread = (id: string) => ({
  status: "archived" as const,
  remoteId: id,
  externalId: id,
  title: "Archived",
});

describe("RemoteThreadListThreadListRuntimeCore.switchToThread unarchive option", () => {
  it("auto-unarchives by default", async () => {
    const THREAD_ID = "archived-default";
    const adapter = makeAdapter({
      list: vi.fn(async () => ({ threads: [archivedThread(THREAD_ID)] })),
    });

    const core = createCore(adapter);
    await core.getLoadThreadsPromise();

    expect(core.archivedThreadIds).toContain(THREAD_ID);
    expect(core.threadIds).not.toContain(THREAD_ID);

    await core.switchToThread(THREAD_ID);

    expect(adapter.unarchive).toHaveBeenCalledWith(THREAD_ID);
    expect(core.threadIds).toContain(THREAD_ID);
    expect(core.archivedThreadIds).not.toContain(THREAD_ID);
    expect(core.getItemById(THREAD_ID)?.status).toBe("regular");
    expect(core.mainThreadId).toBe(core.getItemById(THREAD_ID)?.id);
  });

  it("auto-unarchives when unarchive is explicitly true", async () => {
    const THREAD_ID = "archived-explicit-true";
    const adapter = makeAdapter({
      list: vi.fn(async () => ({ threads: [archivedThread(THREAD_ID)] })),
    });

    const core = createCore(adapter);
    await core.getLoadThreadsPromise();
    await core.switchToThread(THREAD_ID, { unarchive: true });

    expect(adapter.unarchive).toHaveBeenCalledWith(THREAD_ID);
    expect(core.threadIds).toContain(THREAD_ID);
    expect(core.archivedThreadIds).not.toContain(THREAD_ID);
    expect(core.getItemById(THREAD_ID)?.status).toBe("regular");
  });

  it("keeps the thread archived when unarchive: false", async () => {
    const THREAD_ID = "archived-opt-out";
    const adapter = makeAdapter({
      list: vi.fn(async () => ({ threads: [archivedThread(THREAD_ID)] })),
    });

    const core = createCore(adapter);
    await core.getLoadThreadsPromise();
    await core.switchToThread(THREAD_ID, { unarchive: false });

    expect(adapter.unarchive).not.toHaveBeenCalled();
    expect(core.archivedThreadIds).toContain(THREAD_ID);
    expect(core.threadIds).not.toContain(THREAD_ID);
    expect(core.getItemById(THREAD_ID)?.status).toBe("archived");
    expect(core.mainThreadId).toBe(core.getItemById(THREAD_ID)?.id);
  });

  it("does not call unarchive when the target is already regular, regardless of option", async () => {
    const THREAD_ID = "regular-target";
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: THREAD_ID,
            externalId: THREAD_ID,
            title: "Regular",
          },
        ],
      })),
    });

    const core = createCore(adapter);
    await core.getLoadThreadsPromise();
    await core.switchToThread(THREAD_ID, { unarchive: false });

    expect(adapter.unarchive).not.toHaveBeenCalled();
    expect(core.getItemById(THREAD_ID)?.status).toBe("regular");
  });
});

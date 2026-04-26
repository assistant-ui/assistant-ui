import { describe, it, expect, vi } from "vitest";
import { createCore, makeAdapter } from "./remote-thread-list-test-helpers";

describe("RemoteThreadListThreadListRuntimeCore custom metadata", () => {
  it("preserves custom field from list() through to threadItems", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: "thread-1",
            externalId: "ext-1",
            title: "Test",
            custom: { workspaceId: "ws-1", createdAt: "2026-04-26" },
          },
        ],
      })),
    });

    const core = createCore(adapter);
    await core.getLoadThreadsPromise();

    const item = core.getItemById("thread-1");
    expect(item?.custom).toEqual({
      workspaceId: "ws-1",
      createdAt: "2026-04-26",
    });
  });

  it("preserves custom field from fetch() through switchToThread", async () => {
    const adapter = makeAdapter({
      fetch: vi.fn(async (id: string) => ({
        status: "regular" as const,
        remoteId: id,
        externalId: id,
        title: "Test",
        custom: { ownerId: "user-42" },
      })),
    });

    const core = createCore(adapter);
    await core.switchToThread("thread-2");

    const item = core.getItemById("thread-2");
    expect(item?.custom).toEqual({ ownerId: "user-42" });
  });

  it("leaves custom undefined when adapter omits it", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: "thread-3",
            externalId: "ext-3",
            title: "Test",
          },
        ],
      })),
    });

    const core = createCore(adapter);
    await core.getLoadThreadsPromise();

    const item = core.getItemById("thread-3");
    expect(item?.custom).toBeUndefined();
  });

  it("preserves custom across rename optimistic update", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: "thread-4",
            externalId: "ext-4",
            title: "Old",
            custom: { tag: "important" },
          },
        ],
      })),
    });

    const core = createCore(adapter);
    await core.getLoadThreadsPromise();
    await core.rename("thread-4", "New");

    const item = core.getItemById("thread-4");
    expect(item?.title).toBe("New");
    expect(item?.custom).toEqual({ tag: "important" });
  });

  it("preserves custom across archive and unarchive optimistic updates", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: "thread-5",
            externalId: "ext-5",
            title: "Test",
            custom: { workspaceId: "ws-1" },
          },
        ],
      })),
    });

    const core = createCore(adapter);
    await core.getLoadThreadsPromise();

    await core.archive("thread-5");
    expect(core.getItemById("thread-5")?.status).toBe("archived");
    expect(core.getItemById("thread-5")?.custom).toEqual({
      workspaceId: "ws-1",
    });

    await core.unarchive("thread-5");
    expect(core.getItemById("thread-5")?.status).toBe("regular");
    expect(core.getItemById("thread-5")?.custom).toEqual({
      workspaceId: "ws-1",
    });
  });
});

import { describe, it, expect, vi } from "vitest";
import { ThreadListRuntimeImpl } from "../runtime/api/thread-list-runtime";
import { createCore, makeAdapter } from "./remote-thread-list-test-helpers";

describe("RemoteThreadListThreadListRuntimeCore fork", () => {
  it("rejects with a clear error when unsupported", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: "thread-1",
            externalId: "thread-1",
            title: "Source",
          },
        ],
      })),
    });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();

    await expect(core.fork("thread-1")).rejects.toThrow(
      "Remote thread list adapter does not support forking",
    );
  });

  it("returns the forked thread id and records lineage metadata", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: "thread-1",
            externalId: "thread-1",
            title: "Source",
          },
        ],
      })),
      fork: vi.fn(async () => ({
        remoteId: "thread-fork",
        externalId: "thread-fork",
      })),
    });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();

    await expect(
      core.fork("thread-1", { fromMessageId: "msg-1" }),
    ).resolves.toEqual({ threadId: "thread-fork" });

    expect(adapter.fork).toHaveBeenCalledWith("thread-1", {
      fromMessageId: "msg-1",
    });
    expect(core.getItemById("thread-fork")?.forkedFrom).toEqual({
      threadId: "thread-1",
      messageId: "msg-1",
    });
  });

  it("exposes forkedFrom through the thread list item runtime state", async () => {
    class NoopThreadRuntime {}
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: "thread-1",
            externalId: "thread-1",
            title: "Source",
          },
        ],
      })),
      fork: vi.fn(async () => ({
        remoteId: "thread-fork",
        externalId: "thread-fork",
      })),
    });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();

    const runtime = new ThreadListRuntimeImpl(
      core,
      NoopThreadRuntime as unknown as ConstructorParameters<
        typeof ThreadListRuntimeImpl
      >[1],
    );

    await runtime.getItemById("thread-1").fork({ fromMessageId: "msg-2" });

    expect(runtime.getItemById("thread-fork").getState().forkedFrom).toEqual({
      threadId: "thread-1",
      messageId: "msg-2",
    });
  });
});

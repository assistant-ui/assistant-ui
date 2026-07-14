import { describe, it, expect, vi } from "vitest";
import { ThreadListRuntimeImpl } from "../runtime/api/thread-list-runtime";
import {
  createCore,
  deferred,
  makeAdapter,
} from "./remote-thread-list-test-helpers";
import type { RemoteThreadListAdapter } from "../runtimes/remote-thread-list/types";

const singleThreadList = () =>
  vi.fn(async () => ({
    threads: [
      {
        status: "regular" as const,
        remoteId: "thread-1",
        externalId: "thread-1",
        title: "Source",
      },
    ],
  }));

const forkToThreadFork = () =>
  vi.fn(async () => ({
    remoteId: "thread-fork",
    externalId: "thread-fork",
  }));

const makeForkCore = async (
  overrides: Partial<RemoteThreadListAdapter> = {},
) => {
  const adapter = makeAdapter({
    list: singleThreadList(),
    fork: forkToThreadFork(),
    ...overrides,
  });
  const core = createCore(adapter);
  await core.getLoadThreadsPromise();
  return { adapter, core };
};

describe("RemoteThreadListThreadListRuntimeCore fork", () => {
  it("rejects with a clear error when unsupported", async () => {
    const adapter = makeAdapter({ list: singleThreadList() });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();

    await expect(core.fork("thread-1")).rejects.toThrow(
      "Remote thread list adapter does not support forking",
    );
  });

  it("returns the forked thread id and records lineage metadata", async () => {
    const { adapter, core } = await makeForkCore();

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

  it("hydrates persisted lineage from the adapter", async () => {
    const { core } = await makeForkCore({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: "thread-fork",
            externalId: "thread-fork",
            forkedFrom: { threadId: "thread-1", messageId: "msg-1" },
          },
        ],
      })),
    });

    expect(core.getItemById("thread-fork")?.forkedFrom).toEqual({
      threadId: "thread-1",
      messageId: "msg-1",
    });
  });

  it("preserves a completed fork when an older list response reconciles", async () => {
    const staleReload = deferred<{
      threads: Array<{
        status: "regular";
        remoteId: string;
        externalId: string;
        title: string;
      }>;
    }>();
    const list = vi
      .fn()
      .mockResolvedValueOnce({
        threads: [
          {
            status: "regular" as const,
            remoteId: "thread-1",
            externalId: "thread-1",
            title: "Source",
          },
        ],
      })
      .mockReturnValueOnce(staleReload.promise);
    const adapter = makeAdapter({
      list,
      fork: forkToThreadFork(),
    });
    const core = createCore(adapter);

    await core.getLoadThreadsPromise();
    const reloadPromise = core.reload();

    await expect(
      core.fork("thread-1", { fromMessageId: "msg-1" }),
    ).resolves.toEqual({ threadId: "thread-fork" });
    expect(core.threadIds).toEqual(["thread-fork", "thread-1"]);

    staleReload.resolve({
      threads: [
        {
          status: "regular",
          remoteId: "thread-1",
          externalId: "thread-1",
          title: "Source",
        },
      ],
    });
    await reloadPromise;

    expect(core.threadIds).toEqual(["thread-fork", "thread-1"]);
    expect(core.getItemById("thread-fork")?.forkedFrom).toEqual({
      threadId: "thread-1",
      messageId: "msg-1",
    });
  });

  it("initializes a new source thread before forking it", async () => {
    const { adapter, core } = await makeForkCore({
      list: vi.fn(async () => ({ threads: [] })),
      initialize: vi.fn(async (threadId: string) => ({
        remoteId: `remote-${threadId}`,
        externalId: `external-${threadId}`,
      })),
    });

    await core.switchToNewThread();
    const newThreadId = core.newThreadId;
    expect(newThreadId).toBeDefined();

    await expect(
      core.fork(newThreadId!, { fromMessageId: "msg-1" }),
    ).resolves.toEqual({ threadId: "thread-fork" });

    expect(adapter.initialize).toHaveBeenCalledWith(newThreadId);
    expect(adapter.fork).toHaveBeenCalledWith(`remote-${newThreadId}`, {
      fromMessageId: "msg-1",
    });
    expect(core.getItemById("thread-fork")?.forkedFrom).toEqual({
      threadId: `remote-${newThreadId}`,
      messageId: "msg-1",
    });
  });

  it("exposes forkedFrom through the thread list item runtime state", async () => {
    class NoopThreadRuntime {}
    const { core } = await makeForkCore();

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

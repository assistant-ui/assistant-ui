import { describe, it, expect, vi } from "vitest";
import { ThreadListRuntimeImpl } from "../runtime/api/thread-list-runtime";
import { createCore, makeAdapter } from "./remote-thread-list-test-helpers";
import { ExportedMessageRepository } from "../runtime/utils/message-repository";
import type { ThreadRuntimeCore } from "../runtime/interfaces/thread-runtime-core";
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

const sourceRepositoryOf3 = () =>
  ExportedMessageRepository.fromArray([
    { id: "user-1", role: "user", content: "one" },
    { id: "assistant-1", role: "assistant", content: "two" },
    { id: "user-2", role: "user", content: "three" },
  ]);

const stubHookManager = (
  core: ReturnType<typeof createCore>,
  runtimes: {
    sourceRuntime: ThreadRuntimeCore;
    forkRuntime: ThreadRuntimeCore;
  },
) => {
  const hookManager = (
    core as unknown as {
      _hookManager: {
        getThreadRuntimeCore: (id: string) => ThreadRuntimeCore | undefined;
        startThreadRuntime: (id: string) => Promise<ThreadRuntimeCore>;
      };
    }
  )._hookManager;
  hookManager.getThreadRuntimeCore = (id) =>
    id === "thread-1" ? runtimes.sourceRuntime : undefined;
  hookManager.startThreadRuntime = vi.fn(async () => runtimes.forkRuntime);
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

  it("copies the live source branch into the fork runtime", async () => {
    const { core } = await makeForkCore();

    const sourceRuntime = {
      export: vi.fn(() => sourceRepositoryOf3()),
    } as unknown as ThreadRuntimeCore;
    const forkRuntime = {
      import: vi.fn(),
    } as unknown as ThreadRuntimeCore;
    stubHookManager(core, { sourceRuntime, forkRuntime });

    await expect(
      core.fork("thread-1", { fromMessageId: "assistant-1" }),
    ).resolves.toEqual({ threadId: "thread-fork" });

    expect(sourceRuntime.export).toHaveBeenCalled();
    expect(forkRuntime.import).toHaveBeenCalledWith({
      headId: "assistant-1",
      messages: expect.arrayContaining([
        expect.objectContaining({
          message: expect.objectContaining({ id: "user-1" }),
          parentId: null,
        }),
        expect.objectContaining({
          message: expect.objectContaining({ id: "assistant-1" }),
          parentId: "user-1",
        }),
      ]),
    });
    expect(forkRuntime.import).not.toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            message: expect.objectContaining({ id: "user-2" }),
          }),
        ]),
      }),
    );
  });

  it("rejects when the fork source message is not in the thread", async () => {
    const { adapter, core } = await makeForkCore();

    const sourceRuntime = {
      export: vi.fn(() => sourceRepositoryOf3()),
    } as unknown as ThreadRuntimeCore;
    const forkRuntime = {
      import: vi.fn(),
    } as unknown as ThreadRuntimeCore;
    stubHookManager(core, { sourceRuntime, forkRuntime });

    await expect(
      core.fork("thread-1", { fromMessageId: "missing" }),
    ).rejects.toThrow("Message not found in thread");
    expect(adapter.fork).not.toHaveBeenCalled();
  });

  it("copies provider external state for the selected source branch when supported", async () => {
    const { core } = await makeForkCore();

    const externalState = { messages: ["provider-user", "provider-assistant"] };
    const sourceRuntime = {
      export: vi.fn(() => sourceRepositoryOf3()),
      exportExternalState: vi.fn(() => externalState),
    } as unknown as ThreadRuntimeCore;
    const forkRuntime = {
      import: vi.fn(),
      importExternalState: vi.fn(),
    } as unknown as ThreadRuntimeCore;
    stubHookManager(core, { sourceRuntime, forkRuntime });

    await core.fork("thread-1", { fromMessageId: "assistant-1" });

    expect(sourceRuntime.exportExternalState).toHaveBeenCalledWith({
      headId: "assistant-1",
      messages: expect.arrayContaining([
        expect.objectContaining({
          message: expect.objectContaining({ id: "user-1" }),
        }),
        expect.objectContaining({
          message: expect.objectContaining({ id: "assistant-1" }),
        }),
      ]),
    });
    expect(sourceRuntime.exportExternalState).not.toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            message: expect.objectContaining({ id: "user-2" }),
          }),
        ]),
      }),
    );
    expect(forkRuntime.importExternalState).toHaveBeenCalledWith(externalState);
    expect(forkRuntime.import).not.toHaveBeenCalled();
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

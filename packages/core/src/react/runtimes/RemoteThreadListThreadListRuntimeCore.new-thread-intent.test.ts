import { describe, expect, it, vi } from "vitest";
import {
  contextProvider,
  deferred,
  makeAdapter,
  setStartThreadRuntime,
} from "../../tests/remote-thread-list-test-helpers";
import { RemoteThreadListThreadListRuntimeCore } from "./RemoteThreadListThreadListRuntimeCore";

describe("RemoteThreadListThreadListRuntimeCore new-thread intent", () => {
  it("reports an ordinary initialization after a controlled switch settles", async () => {
    const attachThread = deferred<unknown>();
    const adapter = makeAdapter({
      initialize: vi.fn(async () => ({ remoteId: "t1", externalId: "t1" })),
    });
    const runtimeHook = () => ({}) as never;
    const onThreadIdChange = vi.fn();
    const core = new RemoteThreadListThreadListRuntimeCore(
      { adapter, runtimeHook, threadId: "t0", onThreadIdChange },
      contextProvider,
    );
    setStartThreadRuntime(core, (id) =>
      id === "t0" ? attachThread.promise : Promise.resolve({}),
    );
    core.__internal_load();
    await core.getLoadThreadsPromise();
    await vi.waitFor(() => expect(adapter.fetch).toHaveBeenCalledWith("t0"));
    const draftId = core.newThreadId!;
    expect(core.mainThreadId).toBe(draftId);

    core.__internal_setOptions({
      adapter,
      runtimeHook,
      threadId: undefined,
      onThreadIdChange,
    });
    await vi.waitFor(() => expect(core.mainThreadId).toBe(draftId));
    await Promise.resolve();
    await Promise.resolve();

    await core.initialize(draftId);
    expect(onThreadIdChange).toHaveBeenCalledWith("t1");
    expect(core.mainThreadId).toBe(draftId);
    core.__internal_dispose();
  });

  it("treats a retry after initialization rejection as an ordinary message", async () => {
    const attachThread = deferred<unknown>();
    const adapter = makeAdapter({
      initialize: vi
        .fn()
        .mockRejectedValueOnce(new Error("failed"))
        .mockResolvedValueOnce({ remoteId: "t1", externalId: "t1" }),
    });
    const runtimeHook = () => ({}) as never;
    const onThreadIdChange = vi.fn();
    const core = new RemoteThreadListThreadListRuntimeCore(
      { adapter, runtimeHook, threadId: "t0", onThreadIdChange },
      contextProvider,
    );
    setStartThreadRuntime(core, (id) =>
      id === "t0" ? attachThread.promise : Promise.resolve({}),
    );
    core.__internal_load();
    await core.getLoadThreadsPromise();
    await vi.waitFor(() => expect(adapter.fetch).toHaveBeenCalledWith("t0"));
    const draftId = core.newThreadId!;
    core.__internal_setOptions({
      adapter,
      runtimeHook,
      threadId: undefined,
      onThreadIdChange,
    });
    await Promise.resolve();
    await Promise.resolve();

    await expect(core.initialize(draftId)).rejects.toThrow("failed");
    await core.initialize(draftId);
    expect(onThreadIdChange).toHaveBeenCalledWith("t1");
    expect(core.mainThreadId).toBe(draftId);
    core.__internal_dispose();
  });

  it("does not start a switch when initialization resolves after disposal", async () => {
    const attachThread = deferred<unknown>();
    const initialization = deferred<{ remoteId: string; externalId: string }>();
    const adapter = makeAdapter({
      initialize: vi.fn(() => initialization.promise),
    });
    const runtimeHook = () => ({}) as never;
    const onThreadIdChange = vi.fn();
    const core = new RemoteThreadListThreadListRuntimeCore(
      { adapter, runtimeHook, threadId: "t0", onThreadIdChange },
      contextProvider,
    );
    setStartThreadRuntime(core, (id) =>
      id === "t0" ? attachThread.promise : Promise.resolve({}),
    );
    core.__internal_load();
    await core.getLoadThreadsPromise();
    await vi.waitFor(() => expect(adapter.fetch).toHaveBeenCalledWith("t0"));
    const draftId = core.newThreadId!;
    core.__internal_setOptions({
      adapter,
      runtimeHook,
      threadId: undefined,
      onThreadIdChange,
    });
    const pending = core.initialize(draftId);
    core.__internal_dispose();
    initialization.resolve({ remoteId: "t1", externalId: "t1" });
    await pending;
    await Promise.resolve();
    expect(core.mainThreadId).toBe(draftId);
  });

  it("opens a fresh draft when a controlled new-thread request races with draft initialization", async () => {
    const attachDraft = deferred<unknown>();
    const initialization = deferred<{ remoteId: string; externalId: string }>();
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "regular" as const, remoteId: "t0", externalId: "t0" },
        ],
      })),
      initialize: vi.fn(() => initialization.promise),
    });
    const runtimeHook = () => ({}) as never;
    const onThreadIdChange = vi.fn();
    const core = new RemoteThreadListThreadListRuntimeCore(
      { adapter, runtimeHook, threadId: "t0", onThreadIdChange },
      contextProvider,
    );
    setStartThreadRuntime(core, async () => ({}));
    core.__internal_load();
    await core.getLoadThreadsPromise();
    await vi.waitFor(() => expect(core.mainThreadId).toBe("t0"));
    const draftId = core.newThreadId!;
    setStartThreadRuntime(core, (id) =>
      id === draftId ? attachDraft.promise : Promise.resolve({}),
    );

    core.__internal_setOptions({
      adapter,
      runtimeHook,
      threadId: undefined,
      onThreadIdChange,
    });
    const initializing = core.initialize(draftId);
    initialization.resolve({ remoteId: "t1", externalId: "t1" });
    await initializing;
    attachDraft.resolve({});

    await vi.waitFor(() => {
      const main = core.getItemById(core.mainThreadId);
      expect(main?.id).not.toBe(draftId);
      expect(main?.status).toBe("new");
      expect(main?.remoteId).toBeUndefined();
      expect(core.threadIds).toContain(draftId);
      expect(core.getItemById(draftId)?.remoteId).toBe("t1");
    });
    expect(onThreadIdChange).not.toHaveBeenCalledWith("t1");
    core.__internal_dispose();
  });

  it("keeps a controlled new-thread request when the current draft initializes", async () => {
    const attachThread = deferred<unknown>();
    const initialization = deferred<{ remoteId: string; externalId: string }>();
    const adapter = makeAdapter({
      initialize: vi.fn(() => initialization.promise),
    });
    const runtimeHook = () => ({}) as never;
    const onThreadIdChange = vi.fn();
    const core = new RemoteThreadListThreadListRuntimeCore(
      { adapter, runtimeHook, threadId: "t0", onThreadIdChange },
      contextProvider,
    );
    setStartThreadRuntime(core, (id) =>
      id === "t0" ? attachThread.promise : Promise.resolve({}),
    );
    core.__internal_load();
    await core.getLoadThreadsPromise();
    await vi.waitFor(() => expect(adapter.fetch).toHaveBeenCalledWith("t0"));
    const draftId = core.newThreadId!;
    expect(core.mainThreadId).toBe(draftId);

    core.__internal_setOptions({
      adapter,
      runtimeHook,
      threadId: undefined,
      onThreadIdChange,
    });
    const initializing = core.initialize(draftId);
    initialization.resolve({ remoteId: "t1", externalId: "t1" });
    await initializing;
    attachThread.resolve({});

    await vi.waitFor(() => {
      const main = core.getItemById(core.mainThreadId);
      expect(main?.id).not.toBe(draftId);
      expect(main?.status).toBe("new");
      expect(main?.remoteId).toBeUndefined();
      expect(core.threadIds).toContain(draftId);
      expect(core.getItemById(draftId)?.remoteId).toBe("t1");
    });
    expect(onThreadIdChange).not.toHaveBeenCalledWith("t1");
    core.__internal_dispose();
  });
});

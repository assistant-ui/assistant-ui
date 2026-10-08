import { describe, expect, it, vi } from "vitest";
import {
  createCore,
  deferred,
  makeAdapter,
} from "./remote-thread-list-test-helpers";
import {
  createEmptyRemoteThreadState,
  getThreadData,
  LOCAL_THREAD_ID_PREFIX,
  seedNewThread,
  type RemoteThreadState,
} from "../runtimes/remote-thread-list/remote-thread-state";

type InitializeResult = { remoteId: string; externalId: string };
type ListResult = Awaited<ReturnType<ReturnType<typeof makeAdapter>["list"]>>;

describe("RemoteThreadListThreadListRuntimeCore initialize", () => {
  it("keeps a stale initialization from promoting a draft after the replacement list resolves", async () => {
    const initializing = deferred<InitializeResult>();
    const replacementList = deferred<ListResult>();
    const oldAdapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: "anchor",
            externalId: "anchor",
          },
        ],
      })),
      initialize: vi.fn(() => initializing.promise),
    });
    const newAdapter = makeAdapter({
      list: vi.fn(() => replacementList.promise),
    });
    const core = createCore(oldAdapter);

    await core.getLoadThreadsPromise();
    await core.switchToThread("anchor");
    const localId = core.newThreadId!;
    const initializingTask = core.initialize(localId);

    core.__internal_setOptions({
      adapter: newAdapter,
      runtimeHook: () => ({}) as never,
    });
    const loadTask = core.getLoadThreadsPromise();
    replacementList.resolve({
      threads: [
        {
          status: "regular",
          remoteId: "anchor",
          externalId: "anchor",
        },
      ],
    });
    await loadTask;

    initializing.resolve({
      remoteId: "old-remote",
      externalId: "old-external",
    });
    await expect(initializingTask).rejects.toThrow("adapter changed");

    expect(core.threadIds).not.toContain(localId);
    expect(core.newThreadId).toBe(localId);
    expect(core.getItemById(localId)?.status).toBe("new");
    expect(core.getItemById(localId)?.remoteId).toBeUndefined();
  });

  it("keeps a deleted draft hidden when the replacement list resolves before initialization", async () => {
    const initializing = deferred<InitializeResult>();
    const replacementList = deferred<ListResult>();
    const oldAdapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: "anchor",
            externalId: "anchor",
          },
        ],
      })),
      initialize: vi.fn(() => initializing.promise),
    });
    const newAdapter = makeAdapter({
      list: vi.fn(() => replacementList.promise),
    });
    const core = createCore(oldAdapter);

    await core.getLoadThreadsPromise();
    await core.switchToThread("anchor");
    const localId = core.newThreadId!;
    const initializingTask = core.initialize(localId);
    const deleteTask = core.delete(localId);

    core.__internal_setOptions({
      adapter: newAdapter,
      runtimeHook: () => ({}) as never,
    });
    const loadTask = core.getLoadThreadsPromise();
    replacementList.resolve({
      threads: [
        {
          status: "regular",
          remoteId: "anchor",
          externalId: "anchor",
        },
      ],
    });
    await loadTask;
    expect(core.mainThreadId).not.toBe(localId);

    initializing.resolve({
      remoteId: "old-remote",
      externalId: "old-external",
    });
    await expect(initializingTask).rejects.toThrow("adapter changed");
    await expect(deleteTask).rejects.toThrow("adapter changed");

    expect(core.threadIds).not.toContain(localId);
    expect(core.getItemById(localId)).toBeUndefined();
  });

  it("keeps a deleted draft hidden while a replacement adapter loads", async () => {
    const initializing = deferred<InitializeResult>();
    const replacementList = deferred<ListResult>();
    const oldAdapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: "anchor",
            externalId: "anchor",
          },
        ],
      })),
      initialize: vi.fn(() => initializing.promise),
    });
    const newAdapter = makeAdapter({
      list: vi.fn(() => replacementList.promise),
    });
    const core = createCore(oldAdapter);

    await core.getLoadThreadsPromise();
    await core.switchToThread("anchor");
    const localId = core.newThreadId!;
    const initializingTask = core.initialize(localId);
    const state = (
      core as unknown as {
        _state: {
          baseValue: {
            threadData: Record<string, { id: string; status: string }>;
          };
          value: {
            threadData: Record<string, { id: string; status: string }>;
          };
        };
      }
    )._state;

    expect(
      Object.values(state.baseValue.threadData).find(
        (item) => item.id === localId,
      )?.status,
    ).toBe("new");
    expect(
      Object.values(state.value.threadData).find((item) => item.id === localId)
        ?.status,
    ).toBe("regular");

    initializing.resolve({
      remoteId: "old-remote",
      externalId: "old-external",
    });
    const deleteTask = core.delete(localId);
    expect(
      Object.values(state.baseValue.threadData).find(
        (item) => item.id === localId,
      )?.status,
    ).toBe("new");
    expect(
      Object.values(state.value.threadData).find((item) => item.id === localId)
        ?.status,
    ).toBe("regular");

    core.__internal_setOptions({
      adapter: newAdapter,
      runtimeHook: () => ({}) as never,
    });
    const loadTask = core.getLoadThreadsPromise();

    await expect(initializingTask).rejects.toThrow("adapter changed");
    await expect(deleteTask).rejects.toThrow("adapter changed");

    expect(core.isLoading).toBe(true);
    expect(core.threadIds).not.toContain(localId);
    expect(core.getItemById(localId)).toBeUndefined();

    replacementList.resolve({ threads: [] });
    await loadTask;

    expect(core.getItemById(localId)).toBeUndefined();
  });

  it("keeps the selected draft and its runtime when switching away rejects during adapter replacement", async () => {
    const initializing = deferred<InitializeResult>();
    const switching = deferred<void>();
    const replacementList = deferred<ListResult>();
    const oldAdapter = makeAdapter({
      initialize: vi.fn(() => initializing.promise),
    });
    const newAdapter = makeAdapter({
      list: vi.fn(() => replacementList.promise),
    });
    const core = createCore(oldAdapter);
    await core.getLoadThreadsPromise();
    const localId = core.newThreadId!;
    const initializingTask = core.initialize(localId);
    const runtime = {};
    let running = true;
    const hookManager = (
      core as unknown as {
        _hookManager: {
          getThreadRuntimeCore: (id: string) => unknown;
          stopThreadRuntime: (id: string) => void;
        };
      }
    )._hookManager;
    vi.spyOn(hookManager, "getThreadRuntimeCore").mockImplementation((id) =>
      id === localId && running ? runtime : undefined,
    );
    const stop = vi
      .spyOn(hookManager, "stopThreadRuntime")
      .mockImplementation((id) => {
        if (id === localId) running = false;
      });
    (
      core as unknown as { _ensureThreadIsNotMain: () => Promise<void> }
    )._ensureThreadIsNotMain = () => switching.promise;

    const deleteTask = core.delete(localId);
    core.__internal_setOptions({
      adapter: newAdapter,
      runtimeHook: () => ({}) as never,
    });
    const loadTask = core.getLoadThreadsPromise();
    initializing.resolve({
      remoteId: "old-remote",
      externalId: "old-external",
    });
    await expect(initializingTask).rejects.toThrow("adapter changed");
    switching.reject(new Error("switch failed"));
    await expect(deleteTask).rejects.toThrow("switch failed");

    expect(core.isLoading).toBe(true);
    expect(core.mainThreadId).toBe(localId);
    expect(core.threadIds).toContain(localId);
    expect(core.getItemById(localId)?.status).toBe("regular");
    expect(core.getMainThreadRuntimeCore()).toBe(runtime);
    expect(stop).not.toHaveBeenCalledWith(localId);

    replacementList.resolve({ threads: [] });
    await loadTask;
    expect(core.getItemById(localId)).toBeUndefined();
  });

  it("preserves a draft when its initialization rejects after an adapter swap", async () => {
    const initializing = deferred<InitializeResult>();
    const leavingMain = deferred<void>();
    const replacementList = deferred<ListResult>();
    const oldAdapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: "anchor",
            externalId: "anchor",
          },
        ],
      })),
      initialize: vi.fn(() => initializing.promise),
    });
    const newAdapter = makeAdapter({
      list: vi.fn(() => replacementList.promise),
    });
    const core = createCore(oldAdapter);

    await core.getLoadThreadsPromise();
    await core.switchToThread("anchor");
    const localId = core.newThreadId!;
    const initializingTask = core.initialize(localId);
    (
      core as unknown as { _ensureThreadIsNotMain: () => Promise<void> }
    )._ensureThreadIsNotMain = () => leavingMain.promise;
    const deleteTask = core.delete(localId);
    core.__internal_setOptions({
      adapter: newAdapter,
      runtimeHook: () => ({}) as never,
    });
    const loadTask = core.getLoadThreadsPromise();

    initializing.reject(new Error("initialize failed"));
    await expect(initializingTask).rejects.toThrow("initialize failed");
    leavingMain.resolve();
    await expect(deleteTask).rejects.toThrow("adapter changed");

    expect(core.isLoading).toBe(true);
    expect(core.mainThreadId).toBe("anchor");
    expect(core.newThreadId).toBe(localId);
    expect(core.getItemById(localId)?.status).toBe("new");

    replacementList.resolve({ threads: [] });
    await loadTask;
    expect(core.newThreadId).toBe(localId);
    expect(core.getItemById(localId)?.status).toBe("new");
  });

  it("hides a deleted draft when initialization resolves before the replacement list", async () => {
    const initializing = deferred<InitializeResult>();
    const leavingMain = deferred<void>();
    const replacementList = deferred<ListResult>();
    const oldAdapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: "anchor",
            externalId: "anchor",
          },
        ],
      })),
      initialize: vi.fn(() => initializing.promise),
    });
    const newAdapter = makeAdapter({
      list: vi.fn(() => replacementList.promise),
    });
    const core = createCore(oldAdapter);

    await core.getLoadThreadsPromise();
    await core.switchToThread("anchor");
    const localId = core.newThreadId!;
    const initializingTask = core.initialize(localId);
    (
      core as unknown as { _ensureThreadIsNotMain: () => Promise<void> }
    )._ensureThreadIsNotMain = () => leavingMain.promise;
    const deleteTask = core.delete(localId);
    core.__internal_setOptions({
      adapter: newAdapter,
      runtimeHook: () => ({}) as never,
    });
    const loadTask = core.getLoadThreadsPromise();

    leavingMain.resolve();
    await expect(deleteTask).rejects.toThrow("adapter changed");
    expect(core.threadIds).toContain(localId);

    initializing.resolve({
      remoteId: "old-remote",
      externalId: "old-external",
    });
    await expect(initializingTask).rejects.toThrow("adapter changed");

    expect(core.isLoading).toBe(true);
    expect(core.threadIds).not.toContain(localId);
    expect(core.getItemById(localId)).toBeUndefined();

    replacementList.resolve({ threads: [] });
    await loadTask;
  });

  it("preserves a replacement adapter draft that reuses the deleted slot id", async () => {
    const initializing = deferred<InitializeResult>();
    const switching = deferred<void>();
    const nextList = deferred<ListResult>();
    const oldAdapter = makeAdapter({
      initialize: vi.fn(() => initializing.promise),
    });
    const replacementAdapter = makeAdapter();
    const nextAdapter = makeAdapter({
      list: vi.fn(() => nextList.promise),
    });
    const core = createCore(oldAdapter);
    await core.getLoadThreadsPromise();
    const localId = core.newThreadId!;
    const initializingTask = core.initialize(localId);
    const state = (
      core as unknown as {
        _state: {
          baseValue: RemoteThreadState;
          update: (state: RemoteThreadState) => void;
        };
      }
    )._state;
    (
      core as unknown as { _ensureThreadIsNotMain: () => Promise<void> }
    )._ensureThreadIsNotMain = () => switching.promise;

    const deleteTask = core.delete(localId);
    core.__internal_setOptions({
      adapter: replacementAdapter,
      runtimeHook: () => ({}) as never,
    });
    initializing.resolve({
      remoteId: "old-remote",
      externalId: "old-external",
    });
    await expect(initializingTask).rejects.toThrow("adapter changed");
    await core.getLoadThreadsPromise();

    const replacementDraft = seedNewThread(
      createEmptyRemoteThreadState(),
      localId.slice(LOCAL_THREAD_ID_PREFIX.length),
    ).state;
    state.update(replacementDraft);
    expect(core.getItemById(localId)?.status).toBe("new");

    core.__internal_setOptions({
      adapter: nextAdapter,
      runtimeHook: () => ({}) as never,
    });
    const loadTask = core.getLoadThreadsPromise();
    switching.reject(new Error("switch failed"));
    await expect(deleteTask).rejects.toThrow("switch failed");

    expect(core.isLoading).toBe(true);
    expect(getThreadData(state.baseValue, localId)).toBeDefined();
    expect(core.getItemById(localId)?.status).toBe("new");

    nextList.resolve({ threads: [] });
    await loadTask;
    expect(core.getItemById(localId)?.status).toBe("new");
  });

  it("keeps the initialization task on the promoted slot when the adapter changes mid-flight", async () => {
    const initializing = deferred<InitializeResult>();
    const core = createCore(
      makeAdapter({ initialize: vi.fn(() => initializing.promise) }),
    );

    await core.switchToNewThread();
    const localId = core.newThreadId!;
    const pending = core.initialize(localId);

    // An adapter swap advances the generation without resetting the store, so
    // the completion still applies its optimistic transform while `then`
    // declines to reconcile against the retired adapter.
    core.__internal_setOptions({
      adapter: makeAdapter(),
      runtimeHook: () => ({}) as never,
    });

    initializing.resolve({ remoteId: "remote-1", externalId: "external-1" });
    await expect(pending).rejects.toThrow();

    const item = core.getItemById(localId);
    expect(item?.status).toBe("regular");
    await expect(
      item?.status === "new" ? undefined : item?.initializeTask,
    ).resolves.toEqual({ remoteId: "remote-1", externalId: "external-1" });
  });
});

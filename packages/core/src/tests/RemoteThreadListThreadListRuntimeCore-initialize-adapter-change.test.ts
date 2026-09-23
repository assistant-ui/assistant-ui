import { describe, expect, it, vi } from "vitest";
import {
  createCore,
  deferred,
  makeAdapter,
} from "./remote-thread-list-test-helpers";

type InitializeResult = { remoteId: string; externalId: string };

describe("RemoteThreadListThreadListRuntimeCore initialize", () => {
  it("drops the slot promoted under a replaced adapter once its initialize answers", async () => {
    const initializing = deferred<InitializeResult>();
    const core = createCore(
      makeAdapter({ initialize: vi.fn(() => initializing.promise) }),
    );

    await core.switchToNewThread();
    const localId = core.newThreadId!;
    const pending = core.initialize(localId);

    core.__internal_setOptions({
      adapter: makeAdapter(),
      runtimeHook: () => ({}) as never,
    });

    const promoted = core.getItemById(localId);
    expect(promoted?.status).toBe("regular");
    const task =
      promoted?.status === "new" ? undefined : promoted?.initializeTask;
    expect(task).toBeInstanceOf(Promise);

    initializing.resolve({ remoteId: "remote-1", externalId: "external-1" });
    await expect(pending).rejects.toThrow();

    await expect(task).rejects.toThrow();
    expect(core.getItemById(localId)).toBeUndefined();
    expect(core.getItemById(core.mainThreadId!)).toBeDefined();
  });

  it("does not send the replaced adapter's remote id to the new adapter once initialize answers", async () => {
    const initializing = deferred<InitializeResult>();
    const core = createCore(
      makeAdapter({ initialize: vi.fn(() => initializing.promise) }),
    );
    await core.getLoadThreadsPromise();
    const localId = core.newThreadId!;
    const pending = core.initialize(localId).catch(() => {});

    const newAdapter = makeAdapter();
    core.__internal_setOptions({
      adapter: newAdapter,
      runtimeHook: () => ({}) as never,
    });
    core.__internal_load();
    await core.getLoadThreadsPromise();
    initializing.resolve({ remoteId: "old-remote", externalId: "old-remote" });
    await pending;
    expect(core.getItemById(localId)).toBeUndefined();

    await core.archive(localId).catch(() => {});
    await core.delete(localId).catch(() => {});
    expect(newAdapter.archive).not.toHaveBeenCalledWith("old-remote");
    expect(newAdapter.delete).not.toHaveBeenCalledWith("old-remote");
  });

  it("does not send the replaced adapter's remote id to the new adapter while initialize is in flight", async () => {
    const initializing = deferred<InitializeResult>();
    const core = createCore(
      makeAdapter({ initialize: vi.fn(() => initializing.promise) }),
    );
    await core.getLoadThreadsPromise();
    const localId = core.newThreadId!;
    const pending = core.initialize(localId).catch(() => {});

    const newAdapter = makeAdapter();
    core.__internal_setOptions({
      adapter: newAdapter,
      runtimeHook: () => ({}) as never,
    });
    core.__internal_load();
    await core.getLoadThreadsPromise();
    const renaming = core.rename(localId, "Renamed");
    initializing.resolve({ remoteId: "old-remote", externalId: "old-remote" });
    await pending;

    await expect(renaming).rejects.toThrow();
    expect(newAdapter.rename).not.toHaveBeenCalledWith("old-remote", "Renamed");
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  contextProvider,
  deferred,
  makeAdapter,
  setStartThreadRuntime,
} from "../../tests/remote-thread-list-test-helpers";
import { RemoteThreadListThreadListRuntimeCore } from "./RemoteThreadListThreadListRuntimeCore";

describe("RemoteThreadListThreadListRuntimeCore draft custom metadata", () => {
  it("passes draft metadata to initialize without updating the adapter, then updates initialized metadata", async () => {
    const updateCustom = vi.fn(async () => {});
    const adapter = makeAdapter({ updateCustom });
    const core = new RemoteThreadListThreadListRuntimeCore(
      { adapter, runtimeHook: () => ({}) as never },
      contextProvider,
    );
    setStartThreadRuntime(core, async () => ({}));
    await core.getLoadThreadsPromise();
    const draftId = core.mainThreadId;

    await core.updateCustom(draftId, { label: "draft" });
    expect(core.getItemById(draftId)?.custom).toEqual({ label: "draft" });
    expect(updateCustom).not.toHaveBeenCalled();

    await core.initialize(draftId);
    expect(adapter.initialize).toHaveBeenCalledWith(draftId, {
      custom: { label: "draft" },
    });
    expect(updateCustom).not.toHaveBeenCalled();

    await core.updateCustom(draftId, { label: "saved" });
    expect(updateCustom).toHaveBeenCalledWith(draftId, { label: "saved" });
  });

  it("initializes without metadata when the draft has none", async () => {
    const adapter = makeAdapter();
    const core = new RemoteThreadListThreadListRuntimeCore(
      { adapter, runtimeHook: () => ({}) as never },
      contextProvider,
    );
    setStartThreadRuntime(core, async () => ({}));
    await core.getLoadThreadsPromise();
    const draftId = core.mainThreadId;

    await core.initialize(draftId);
    expect(adapter.initialize).toHaveBeenCalledWith(draftId);
  });

  it("forwards metadata set while initialization is pending once the remote ID resolves", async () => {
    const init = deferred<{ remoteId: string; externalId: undefined }>();
    const updateCustom = vi.fn(async () => {});
    const adapter = makeAdapter({
      initialize: vi.fn(() => init.promise),
      updateCustom,
    });
    const core = new RemoteThreadListThreadListRuntimeCore(
      { adapter, runtimeHook: () => ({}) as never },
      contextProvider,
    );
    setStartThreadRuntime(core, async () => ({}));
    await core.getLoadThreadsPromise();
    const draftId = core.mainThreadId;

    const initialized = core.initialize(draftId);
    const updated = core.updateCustom(draftId, { label: "pending" });
    expect(core.getItemById(draftId)?.custom).toEqual({ label: "pending" });
    expect(updateCustom).not.toHaveBeenCalled();

    init.resolve({ remoteId: "remote-1", externalId: undefined });
    await initialized;
    await updated;
    expect(updateCustom).toHaveBeenCalledWith("remote-1", { label: "pending" });
    expect(core.getItemById("remote-1")?.custom).toEqual({ label: "pending" });
  });
});

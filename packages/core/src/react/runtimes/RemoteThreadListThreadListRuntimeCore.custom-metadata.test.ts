import { describe, expect, it, vi } from "vitest";
import {
  contextProvider,
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
});

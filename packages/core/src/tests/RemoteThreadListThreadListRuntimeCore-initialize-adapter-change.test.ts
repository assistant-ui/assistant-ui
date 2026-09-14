import { describe, expect, it, vi } from "vitest";
import {
  createCore,
  deferred,
  makeAdapter,
} from "./remote-thread-list-test-helpers";

type InitializeResult = { remoteId: string; externalId: string };

describe("RemoteThreadListThreadListRuntimeCore initialize", () => {
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

import { describe, expect, it } from "vitest";
import type { ThreadListRuntimeCore } from "../../runtime/interfaces/thread-list-runtime-core";
import { RemoteThreadListHookInstanceManager } from "./RemoteThreadListHookInstanceManager";

describe("RemoteThreadListHookInstanceManager", () => {
  it("rejects a pending start when the thread runtime is stopped", async () => {
    const manager = new RemoteThreadListHookInstanceManager(() => {
      throw new Error("Runtime hook should not render during this test");
    }, {} as ThreadListRuntimeCore);

    const startPromise = manager.startThreadRuntime("thread-1");
    manager.stopThreadRuntime("thread-1");

    await expect(startPromise).rejects.toThrow(
      "Thread was deleted before runtime was started",
    );
  });
});

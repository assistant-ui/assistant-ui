import { describe, expect, it, vi } from "vitest";
import {
  createCore,
  deferred,
  makeAdapter,
  setStartThreadRuntime,
} from "../../tests/remote-thread-list-test-helpers";

describe("RemoteThreadListThreadListRuntimeCore current thread selection", () => {
  it("cancels a pending direct switch when the displayed thread is selected", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "regular" as const, remoteId: "r0" },
          { status: "regular" as const, remoteId: "r1" },
        ],
      })),
    });
    const onThreadIdChange = vi.fn();
    const core = createCore(adapter, "r0", onThreadIdChange);
    core.__internal_load();
    await core.getLoadThreadsPromise();
    await vi.waitFor(() => expect(core.mainThreadId).toBe("r0"));

    const attach = deferred<unknown>();
    const startThreadRuntime = vi.fn((id: string) =>
      id === "r1" ? attach.promise : Promise.resolve({}),
    );
    setStartThreadRuntime(core, startThreadRuntime);
    const directSwitch = core.switchToThread("r1");
    await vi.waitFor(() =>
      expect(startThreadRuntime).toHaveBeenCalledWith("r1"),
    );

    await core.switchToThread("r0");
    attach.resolve({});
    await directSwitch;

    expect(core.mainThreadId).toBe("r0");
    expect(onThreadIdChange).not.toHaveBeenCalledWith("r1");
  });

  it("preserves a pending controlled switch when the displayed thread is selected", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "regular" as const, remoteId: "r0" },
          { status: "regular" as const, remoteId: "r1" },
        ],
      })),
    });
    const onThreadIdChange = vi.fn();
    const core = createCore(adapter, "r0", onThreadIdChange);
    core.__internal_load();
    await core.getLoadThreadsPromise();
    await vi.waitFor(() => expect(core.mainThreadId).toBe("r0"));

    const attach = deferred<unknown>();
    const startThreadRuntime = vi.fn((id: string) =>
      id === "r1" ? attach.promise : Promise.resolve({}),
    );
    setStartThreadRuntime(core, startThreadRuntime);
    core.__internal_setOptions({
      adapter,
      runtimeHook: () => ({}) as never,
      threadId: "r1",
      onThreadIdChange,
    });
    await vi.waitFor(() =>
      expect(startThreadRuntime).toHaveBeenCalledWith("r1"),
    );
    const controlledSwitch = (core as unknown as { _switchTask: Promise<void> })
      ._switchTask;

    await core.switchToThread("r0");
    expect(core.mainThreadId).toBe("r0");
    expect(onThreadIdChange).not.toHaveBeenCalled();

    attach.resolve({});
    await controlledSwitch;
    expect(core.mainThreadId).toBe("r1");
    expect(onThreadIdChange).not.toHaveBeenCalled();
  });
});

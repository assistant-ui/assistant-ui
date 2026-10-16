import { expect, it, vi } from "vitest";
import { ReadonlyThreadRuntimeCore } from "../../runtimes/readonly/ReadonlyThreadRuntimeCore";
import {
  contextProvider,
  makeAdapter,
} from "../../tests/remote-thread-list-test-helpers";
import type { RemoteThreadListHook } from "./RemoteThreadResource";
import { RemoteThreadListThreadListRuntimeCore } from "./RemoteThreadListThreadListRuntimeCore";

type HookManager = {
  instances: Map<string, { generation: number }>;
  setRuntimeHook(runtimeHook: RemoteThreadListHook): void;
  stopThreadRuntime(id: string): void;
  _publishThreadRuntime(
    id: string,
    runtime: ReadonlyThreadRuntimeCore,
    generation: number,
  ): void;
};

const setup = async (
  onUnarchive: (manager: HookManager) => void = (manager) =>
    manager.stopThreadRuntime("thread-b"),
) => {
  const adapter = makeAdapter({
    list: vi.fn(async () => ({
      threads: [
        { status: "regular" as const, remoteId: "thread-a" },
        { status: "archived" as const, remoteId: "thread-b" },
      ],
    })),
    unarchive: vi.fn(async () => onUnarchive(manager)),
  });
  const core = new RemoteThreadListThreadListRuntimeCore(
    { adapter, runtimeHook: () => ({}) as never },
    contextProvider,
  );
  const manager = (core as unknown as { _hookManager: HookManager })
    ._hookManager;
  const publish = (id: string, runtime: ReadonlyThreadRuntimeCore) =>
    manager._publishThreadRuntime(
      id,
      runtime,
      manager.instances.get(id)!.generation,
    );

  await core.getLoadThreadsPromise();
  const switchToA = core.switchToThread("thread-a");
  publish("thread-a", new ReadonlyThreadRuntimeCore());
  await switchToA;
  expect(core.mainThreadId).toBe("thread-a");

  return { core, manager, publish };
};

it("settles a switch only after a replacement runtime attaches", async () => {
  const { core, publish } = await setup();

  const switchToB = core.switchToThread("thread-b");
  let settled = false;
  void switchToB.then(
    () => (settled = true),
    () => (settled = true),
  );
  publish("thread-b", new ReadonlyThreadRuntimeCore());
  await vi.waitFor(() => expect(core.mainThreadId).toBe("thread-b"));
  await Promise.resolve();
  const settledBeforeAttachment = settled;
  const replacement = new ReadonlyThreadRuntimeCore();
  publish("thread-b", replacement);
  await switchToB;

  expect(settledBeforeAttachment).toBe(false);
  expect(core.getMainThreadRuntimeCore()).toBe(replacement);
});

it("settles a switch only after the target's current runtime generation attaches", async () => {
  const { core, publish } = await setup((manager) =>
    manager.setRuntimeHook(() => ({}) as never),
  );

  const switchToB = core.switchToThread("thread-b");
  const settled = vi.fn();
  void switchToB.then(settled, settled);
  publish("thread-b", new ReadonlyThreadRuntimeCore());
  await vi.waitFor(() => expect(core.mainThreadId).toBe("thread-b"));
  await new Promise<void>((resolve) => setTimeout(resolve, 0));

  expect(settled).not.toHaveBeenCalled();
  const replacement = new ReadonlyThreadRuntimeCore();
  publish("thread-b", replacement);
  await switchToB;
  expect(core.getMainThreadRuntimeCore()).toBe(replacement);
});

it("joins repeated switches until the replacement runtime attaches", async () => {
  const { core, publish } = await setup();
  const first = core.switchToThread("thread-b");
  const firstSettled = vi.fn();
  void first.then(firstSettled, firstSettled);
  publish("thread-b", new ReadonlyThreadRuntimeCore());
  await vi.waitFor(() => expect(core.mainThreadId).toBe("thread-b"));

  const second = core.switchToThread("thread-b");
  const secondSettled = vi.fn();
  void second.then(secondSettled, secondSettled);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));

  expect(firstSettled).not.toHaveBeenCalled();
  expect(secondSettled).not.toHaveBeenCalled();
  const replacement = new ReadonlyThreadRuntimeCore();
  publish("thread-b", replacement);
  await Promise.all([first, second]);

  expect(firstSettled).toHaveBeenCalledTimes(1);
  expect(secondSettled).toHaveBeenCalledTimes(1);
  expect(core.getMainThreadRuntimeCore()).toBe(replacement);
});

it("rejects if the replacement runtime is stopped before attachment", async () => {
  const { core, manager, publish } = await setup();
  const switchToB = core.switchToThread("thread-b");
  const rejection = expect(switchToB).rejects.toThrow(
    "Thread was deleted before runtime was started",
  );
  publish("thread-b", new ReadonlyThreadRuntimeCore());
  await vi.waitFor(() => expect(core.mainThreadId).toBe("thread-b"));

  manager.stopThreadRuntime("thread-b");
  await rejection;
});

it("settles a replacement wait when a newer switch supersedes it", async () => {
  const { core, publish } = await setup();
  const switchToB = core.switchToThread("thread-b");
  publish("thread-b", new ReadonlyThreadRuntimeCore());
  await vi.waitFor(() => expect(core.mainThreadId).toBe("thread-b"));

  await core.switchToThread("thread-a");
  await switchToB;
  expect(core.mainThreadId).toBe("thread-a");
});

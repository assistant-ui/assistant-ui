import { describe, expect, it, vi } from "vitest";
import { ExternalStoreThreadListRuntimeCore } from "../runtimes/external-store/external-store-thread-list-runtime-core";
import type { ExternalStoreThreadRuntimeCore } from "../runtimes/external-store/external-store-thread-runtime-core";
import type { ExternalStoreThreadListAdapter } from "../runtimes/external-store/external-store-adapter";
import { ThreadListRuntimeImpl } from "../runtime/api/thread-list-runtime";

const makeFactory = () =>
  vi.fn(
    () =>
      ({
        subscribe: () => () => {},
      }) as unknown as ExternalStoreThreadRuntimeCore,
  );

const makeAdapter = (
  overrides: Partial<ExternalStoreThreadListAdapter> = {},
): ExternalStoreThreadListAdapter => ({ ...overrides });

describe("ExternalStoreThreadListRuntimeCore - construction", () => {
  it("assigns a resolvable fallback mainThreadId when adapter has no threadId", () => {
    const core = new ExternalStoreThreadListRuntimeCore(
      makeAdapter(),
      makeFactory(),
    );
    expect(typeof core.mainThreadId).toBe("string");
    expect(core.mainThreadId.length).toBeGreaterThan(0);
    expect(core.getItemById(core.mainThreadId)).toBeDefined();
  });

  it("picks up mainThreadId from adapter.threadId on construction (regression: #2577)", () => {
    const core = new ExternalStoreThreadListRuntimeCore(
      makeAdapter({ threadId: "thread-alpha" }),
      makeFactory(),
    );
    expect(core.mainThreadId).toBe("thread-alpha");
  });

  it("exposes threadIds from adapter.threads on construction", () => {
    const core = new ExternalStoreThreadListRuntimeCore(
      makeAdapter({
        threadId: "thread-alpha",
        threads: [
          { id: "thread-alpha", status: "regular" },
          { id: "thread-beta", status: "regular" },
        ],
      }),
      makeFactory(),
    );
    expect(core.threadIds).toEqual(["thread-alpha", "thread-beta"]);
    expect(core.mainThreadId).toBe("thread-alpha");
  });

  it("creates the main thread instance exactly once on construction", () => {
    const factory = makeFactory();
    new ExternalStoreThreadListRuntimeCore(
      makeAdapter({ threadId: "thread-alpha" }),
      factory,
    );
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("creates the main thread instance exactly once when adapter has no threadId", () => {
    const factory = makeFactory();
    new ExternalStoreThreadListRuntimeCore(makeAdapter(), factory);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("binds getMainThreadRuntimeCore() to the instance produced by the factory", () => {
    const instance = {
      subscribe: () => () => {},
    } as unknown as ExternalStoreThreadRuntimeCore;
    const factory = vi.fn(() => instance);
    const core = new ExternalStoreThreadListRuntimeCore(
      makeAdapter({ threadId: "thread-alpha" }),
      factory,
    );
    expect(core.getMainThreadRuntimeCore()).toBe(instance);
  });

  it("preserves the frozen threadItems default when the adapter has no threads", () => {
    const a = new ExternalStoreThreadListRuntimeCore(
      makeAdapter(),
      makeFactory(),
    );
    const b = new ExternalStoreThreadListRuntimeCore(
      makeAdapter(),
      makeFactory(),
    );
    // Two empty-adapter constructions should share the frozen DEFAULT_THREAD_DATA
    // singleton rather than each getting a fresh `{ ... }` clone.
    expect(a.threadItems).toBe(b.threadItems);
  });
});

describe("ExternalStoreThreadListRuntimeCore - __internal_setAdapter", () => {
  it("updates mainThreadId when adapter.threadId changes", () => {
    const core = new ExternalStoreThreadListRuntimeCore(
      makeAdapter({ threadId: "thread-alpha" }),
      makeFactory(),
    );
    core.__internal_setAdapter(makeAdapter({ threadId: "thread-beta" }));
    expect(core.mainThreadId).toBe("thread-beta");
  });

  it("rebuilds the main thread instance when threadId changes", () => {
    const factory = makeFactory();
    const core = new ExternalStoreThreadListRuntimeCore(
      makeAdapter({ threadId: "thread-alpha" }),
      factory,
    );
    const constructionCalls = factory.mock.calls.length;
    core.__internal_setAdapter(makeAdapter({ threadId: "thread-beta" }));
    expect(factory.mock.calls.length).toBe(constructionCalls + 1);
  });

  it("does not rebuild the main thread when only threads array changes", () => {
    const factory = makeFactory();
    const core = new ExternalStoreThreadListRuntimeCore(
      makeAdapter({
        threadId: "thread-alpha",
        threads: [{ id: "thread-alpha", status: "regular" }],
      }),
      factory,
    );
    const constructionCalls = factory.mock.calls.length;
    core.__internal_setAdapter(
      makeAdapter({
        threadId: "thread-alpha",
        threads: [
          { id: "thread-alpha", status: "regular" },
          { id: "thread-beta", status: "regular" },
        ],
      }),
    );
    expect(factory.mock.calls.length).toBe(constructionCalls);
    expect(core.threadIds).toEqual(["thread-alpha", "thread-beta"]);
  });

  it("notifies subscribers on threadId change", () => {
    const core = new ExternalStoreThreadListRuntimeCore(
      makeAdapter({ threadId: "thread-alpha" }),
      makeFactory(),
    );
    const callback = vi.fn();
    core.subscribe(callback);
    core.__internal_setAdapter(makeAdapter({ threadId: "thread-beta" }));
    expect(callback).toHaveBeenCalled();
  });
});

describe("ExternalStoreThreadListRuntimeCore - isMain via ThreadListRuntimeImpl", () => {
  // Stub to avoid constructing the full ThreadRuntimeImpl graph when we only
  // care about ThreadListItemRuntime.getState().isMain.
  class NoopThreadRuntime {}

  const buildImpl = (adapter: ExternalStoreThreadListAdapter) => {
    const core = new ExternalStoreThreadListRuntimeCore(adapter, makeFactory());
    return new ThreadListRuntimeImpl(
      core,
      NoopThreadRuntime as unknown as Parameters<
        typeof ThreadListRuntimeImpl
      >[1],
    );
  };

  it("reports isMain=true for adapter.threadId on construction (user-visible regression: #2577)", () => {
    const impl = buildImpl({
      threadId: "thread-alpha",
      threads: [
        { id: "thread-alpha", status: "regular" },
        { id: "thread-beta", status: "regular" },
      ],
    });
    expect(impl.getItemById("thread-alpha").getState().isMain).toBe(true);
    expect(impl.getItemById("thread-beta").getState().isMain).toBe(false);
  });

  it("reflects the main thread in the aggregated ThreadListState on construction", () => {
    const impl = buildImpl({
      threadId: "thread-alpha",
      threads: [
        { id: "thread-alpha", status: "regular" },
        { id: "thread-beta", status: "regular" },
      ],
    });
    const state = impl.getState();
    expect(state.mainThreadId).toBe("thread-alpha");
    expect(state.threadIds).toEqual(["thread-alpha", "thread-beta"]);
  });
});

describe("ExternalStoreThreadListRuntimeCore - switchToThread", () => {
  it("invokes onSwitchToThread when the target differs from mainThreadId", async () => {
    const onSwitchToThread = vi.fn(async () => {});
    const core = new ExternalStoreThreadListRuntimeCore(
      makeAdapter({ threadId: "thread-alpha", onSwitchToThread }),
      makeFactory(),
    );
    await core.switchToThread("thread-beta");
    expect(onSwitchToThread).toHaveBeenCalledWith("thread-beta");
  });

  it("early-returns without calling onSwitchToThread when target equals initial threadId (regression: #2577)", async () => {
    const onSwitchToThread = vi.fn(async () => {});
    const core = new ExternalStoreThreadListRuntimeCore(
      makeAdapter({ threadId: "thread-alpha", onSwitchToThread }),
      makeFactory(),
    );
    await core.switchToThread("thread-alpha");
    expect(onSwitchToThread).not.toHaveBeenCalled();
  });
});

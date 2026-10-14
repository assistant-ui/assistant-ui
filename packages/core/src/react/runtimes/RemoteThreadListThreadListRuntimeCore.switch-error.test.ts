import { afterEach, describe, expect, it, vi } from "vitest";
import { ThreadListAdapterChangedError } from "../../runtimes/remote-thread-list/adapter-changed";
import type { RemoteThreadListResponse } from "../../runtimes/remote-thread-list/types";
import {
  contextProvider,
  createCore,
  deferred,
  makeAdapter,
  setStartThreadRuntime,
} from "../../tests/remote-thread-list-test-helpers";
import { RemoteThreadListThreadListRuntimeCore } from "./RemoteThreadListThreadListRuntimeCore";

describe("RemoteThreadListThreadListRuntimeCore switch errors", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports a failed initial controlled switch without changing the main thread", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("offline");
    const core = createCore(
      makeAdapter({
        fetch: vi.fn(async () => {
          throw error;
        }),
      }),
      "r5",
    );
    const initialMain = core.mainThreadId;
    const seen: unknown[] = [];
    core.subscribe(() => seen.push(core.switchError));

    core.__internal_load();
    await vi.waitFor(() =>
      expect(core.switchError).toEqual({ threadId: "r5", error }),
    );

    expect(core.mainThreadId).toBe(initialMain);
    expect(seen).toContainEqual({ threadId: "r5", error });
  });

  it("reports an uncontrolled failure and clears it when a new switch starts", async () => {
    const error = new Error("missing");
    const core = createCore(
      makeAdapter({
        fetch: vi.fn(async () => {
          throw error;
        }),
      }),
    );

    await expect(core.switchToThread("missing")).rejects.toBe(error);
    expect(core.switchError).toEqual({ threadId: "missing", error });

    const seen: unknown[] = [];
    core.subscribe(() => seen.push(core.switchError));
    await core.switchToNewThread();

    expect(core.switchError).toBeUndefined();
    expect(seen).toContain(undefined);
  });

  it("ignores a failed switch superseded before its fetch rejects", async () => {
    const fetch =
      deferred<Awaited<ReturnType<ReturnType<typeof makeAdapter>["fetch"]>>>();
    const core = createCore(makeAdapter({ fetch: vi.fn(() => fetch.promise) }));
    const first = core.switchToThread("missing");

    await core.switchToNewThread();
    fetch.reject(new Error("late failure"));
    await expect(first).rejects.toThrow("late failure");

    expect(core.switchError).toBeUndefined();
  });

  it("does not report a silent adapter change", async () => {
    const error = new ThreadListAdapterChangedError();
    const core = createCore(
      makeAdapter({
        fetch: vi.fn(async () => {
          throw error;
        }),
      }),
    );

    await expect(core.switchToThread("r5")).rejects.toBe(error);

    expect(core.switchError).toBeUndefined();
  });

  it("reports a failed controlled switch after the threadId option changes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("offline");
    const adapter = makeAdapter({
      fetch: vi.fn(async () => {
        throw error;
      }),
    });
    const core = createCore(adapter);
    core.__internal_load();
    await core.getLoadThreadsPromise();

    core.__internal_setOptions({
      adapter,
      runtimeHook: () => ({}) as never,
      threadId: "r5",
    });
    await vi.waitFor(() =>
      expect(core.switchError).toEqual({ threadId: "r5", error }),
    );
  });

  it("reports a failed initialThreadId switch", async () => {
    const error = new Error("offline");
    const core = new RemoteThreadListThreadListRuntimeCore(
      {
        adapter: makeAdapter({
          fetch: vi.fn(async () => {
            throw error;
          }),
        }),
        runtimeHook: () => ({}) as never,
        initialThreadId: "r5",
      },
      contextProvider,
    );
    setStartThreadRuntime(core, async () => ({}));

    core.__internal_load();
    await vi.waitFor(() =>
      expect(core.switchError).toEqual({ threadId: "r5", error }),
    );
  });

  it("reports a failed controlled switch reapplied after a load", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchError = new Error("fetch failed");
    const runtimeError = new Error("runtime failed");
    const page = deferred<RemoteThreadListResponse>();
    const core = createCore(
      makeAdapter({
        list: vi.fn(() => page.promise),
        fetch: vi.fn(async () => {
          throw fetchError;
        }),
      }),
      "r5",
    );
    setStartThreadRuntime(core, async () => {
      throw runtimeError;
    });

    core.__internal_load();
    await vi.waitFor(() =>
      expect(core.switchError).toEqual({ threadId: "r5", error: fetchError }),
    );
    page.resolve({ threads: [{ status: "regular", remoteId: "r5" }] });
    await core.getLoadThreadsPromise();

    await vi.waitFor(() =>
      expect(core.switchError).toEqual({ threadId: "r5", error: runtimeError }),
    );
  });
});

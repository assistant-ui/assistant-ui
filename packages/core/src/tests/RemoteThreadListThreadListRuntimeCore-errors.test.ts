import { describe, it, expect, vi } from "vitest";
import {
  contextProvider,
  createCore,
  makeAdapter,
  setStartThreadRuntime,
} from "./remote-thread-list-test-helpers";
import { RemoteThreadListThreadListRuntimeCore } from "../react/runtimes/RemoteThreadListThreadListRuntimeCore";
import { InMemoryThreadListAdapter } from "../runtimes/remote-thread-list/adapter/in-memory";

describe("RemoteThreadListThreadListRuntimeCore errors", () => {
  it("includes the requested thread id when a thread is missing", async () => {
    const core = createCore(makeAdapter());

    await expect(core.rename("missing-thread", "New title")).rejects.toThrow(
      'Thread "missing-thread" not found while renaming it.',
    );
  });

  it("includes the requested thread id and status when an operation is invalid", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "archived" as const,
            remoteId: "archived-thread",
            externalId: "archived-thread",
            title: "Archived",
          },
        ],
      })),
    });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();

    await expect(core.archive("archived-thread")).rejects.toThrow(
      'Thread "archived-thread" has status "archived", so it cannot be archived.',
    );
  });

  it("logs a controlled threadId switch that fails when the list mounts", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchError = new Error("fetch failed");
    const core = createCore(
      makeAdapter({
        fetch: vi.fn(async () => {
          throw fetchError;
        }),
      }),
      "missing-thread",
    );

    core.__internal_load();
    await new Promise((resolve) => setTimeout(resolve));

    expect(error).toHaveBeenCalledWith(
      "[assistant-ui] thread list switch failed:",
      fetchError,
    );
    error.mockRestore();
  });

  it("logs a controlled threadId switch that fails when the threadId prop changes", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchError = new Error("fetch failed");
    const adapter = makeAdapter({
      fetch: vi.fn(async () => {
        throw fetchError;
      }),
    });
    const runtimeHook = () => ({}) as never;
    const core = new RemoteThreadListThreadListRuntimeCore(
      { adapter, runtimeHook, threadId: undefined },
      contextProvider,
    );
    setStartThreadRuntime(core, async () => ({}));
    core.__internal_load();
    await core.getLoadThreadsPromise();
    const mainThreadId = core.mainThreadId;

    core.__internal_setOptions({
      adapter,
      runtimeHook,
      threadId: "missing-thread",
    });
    await new Promise((resolve) => setTimeout(resolve));

    expect(error).toHaveBeenCalledWith(
      "[assistant-ui] thread list switch failed:",
      fetchError,
    );
    expect(core.mainThreadId).toBe(mainThreadId);
    error.mockRestore();
  });

  it("includes the requested thread id when the in-memory adapter cannot fetch it", async () => {
    const adapter = new InMemoryThreadListAdapter();

    await expect(adapter.fetch("missing-thread")).rejects.toThrow(
      'Thread "missing-thread" not found in in-memory thread list.',
    );
  });
});

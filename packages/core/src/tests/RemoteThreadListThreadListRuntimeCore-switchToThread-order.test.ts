import { describe, expect, it, vi } from "vitest";
import type { RemoteThreadMetadata } from "../runtimes/remote-thread-list/types";
import {
  createCore,
  deferred,
  makeAdapter,
} from "./remote-thread-list-test-helpers";

const thread = (id: string): RemoteThreadMetadata => ({
  status: "regular",
  remoteId: id,
  externalId: id,
  title: id,
});

describe("RemoteThreadListThreadListRuntimeCore.switchToThread order", () => {
  it("preserves the latest switch when an earlier fetch resolves last", async () => {
    const fetchB = deferred<RemoteThreadMetadata>();
    const fetchC = deferred<RemoteThreadMetadata>();
    const adapter = makeAdapter({
      fetch: vi.fn((id: string) =>
        id === "thread-b" ? fetchB.promise : fetchC.promise,
      ),
    });
    const core = createCore(adapter);

    const switchToB = core.switchToThread("thread-b");
    const switchToC = core.switchToThread("thread-c");

    fetchC.resolve(thread("thread-c"));
    await switchToC;
    fetchB.resolve(thread("thread-b"));
    await switchToB;

    expect(core.mainThreadId).toBe(core.getItemById("thread-c")?.id);
  });

  it("preserves the latest switch when an earlier runtime starts last", async () => {
    const runtimeB = deferred<unknown>();
    const runtimeC = deferred<unknown>();
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [thread("thread-b"), thread("thread-c")],
      })),
    });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();

    (
      core as unknown as {
        _hookManager: {
          startThreadRuntime: (id: string) => Promise<unknown>;
        };
      }
    )._hookManager.startThreadRuntime = (id) =>
      id === core.getItemById("thread-b")?.id
        ? runtimeB.promise
        : runtimeC.promise;

    const switchToB = core.switchToThread("thread-b");
    const switchToC = core.switchToThread("thread-c");

    runtimeC.resolve({});
    await switchToC;
    runtimeB.resolve({});
    await switchToB;

    expect(core.mainThreadId).toBe(core.getItemById("thread-c")?.id);
  });
});

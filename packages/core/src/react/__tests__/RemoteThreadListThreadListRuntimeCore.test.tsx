import { describe, it, expect, vi } from "vitest";
import { RemoteThreadListThreadListRuntimeCore } from "../RemoteThreadListThreadListRuntimeCore";
import type { RemoteThreadListAdapter } from "../../../runtimes/remote-thread-list/types";

function makeAdapter(
  overrides: Partial<RemoteThreadListAdapter> = {},
): RemoteThreadListAdapter {
  return {
    list: vi.fn(async () => ({ threads: [] })),
    initialize: vi.fn(async (threadId: string) => ({
      remoteId: threadId,
      externalId: threadId,
    })),
    rename: vi.fn(async () => {}),
    archive: vi.fn(async () => {}),
    unarchive: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    generateTitle: vi.fn(
      async () =>
        new ReadableStream({
          start(c) {
            c.close();
          },
        }),
    ),
    fetch: vi.fn(async (threadId: string) => ({
      status: "regular" as const,
      remoteId: threadId,
      externalId: threadId,
      title: "Test",
    })),
    ...overrides,
  };
}

describe("RemoteThreadListThreadListRuntimeCore", () => {
  it("does not duplicate threadIds when switchToThread races with list()", async () => {
    const THREAD_ID = "thread-1";

    // list() resolves with the same thread that switchToThread is about to fetch.
    // Both are in flight concurrently — this simulates the real race.
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          {
            status: "regular" as const,
            remoteId: THREAD_ID,
            externalId: THREAD_ID,
            title: "Test",
          },
        ],
      })),
      fetch: vi.fn(async (id: string) => {
        // Give list() a chance to resolve during this await
        await new Promise((r) => setTimeout(r, 0));
        return {
          status: "regular" as const,
          remoteId: id,
          externalId: id,
          title: "Test",
        };
      }),
    });

    const core = new RemoteThreadListThreadListRuntimeCore({
      adapter,
      runtimeHook: () => ({}) as never,
      threadId: THREAD_ID,
    });

    // Kick off both concurrently, as the real component flow does.
    await Promise.all([
      core.getLoadThreadsPromise(),
      core.switchToThread(THREAD_ID),
    ]);

    const occurrences = core.threadIds.filter((id) => id === THREAD_ID).length;
    expect(occurrences).toBe(1);
  });
});
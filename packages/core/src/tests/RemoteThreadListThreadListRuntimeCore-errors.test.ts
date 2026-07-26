import { describe, it, expect, vi } from "vitest";
import { createCore, makeAdapter } from "./remote-thread-list-test-helpers";
import { InMemoryThreadListAdapter } from "../runtimes/remote-thread-list/adapter/in-memory";

describe("RemoteThreadListThreadListRuntimeCore errors", () => {
  it("includes the requested thread id when a thread is missing", () => {
    const core = createCore(makeAdapter());

    expect(() => core.rename("missing-thread", "New title")).toThrow(
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

  it("includes the requested thread id when the in-memory adapter cannot fetch it", async () => {
    const adapter = new InMemoryThreadListAdapter();

    await expect(adapter.fetch("missing-thread")).rejects.toThrow(
      'Thread "missing-thread" not found in in-memory thread list.',
    );
  });
});

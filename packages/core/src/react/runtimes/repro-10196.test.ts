// Regression on assistant-ui main (formal model: remote-thread-list, FixQueue; found by
// configs/class-all-fixes-same-tick.cfg violating Q1_AgreesWithServer).
// #9767 sends each thread's adapter mutations in reservation order. archive() and delete()
// reserve their slot before awaiting ensure-not-main but add their optimistic update after it,
// so an unarchive called in between is sent after the second archive while its optimistic update
// sits before it. Every call succeeds, the server ends "regular", and the list shows "archived".
// Drop into: packages/core/src/react/runtimes/
// Run: pnpm -C packages/core exec vitest run src/react/runtimes/9767-status-order.test.ts
// Results (2026-10-28): FAILS on main 852a3fa2a and on 45e3d2285 (#9767) (shown "archived", server
// "regular"); passes on 9f673a3f6, the commit before #9767 (calls archive, unarchive, archive).
import { describe, expect, it, vi } from "vitest";
import {
  createCore,
  deferred,
  makeAdapter,
} from "../../tests/remote-thread-list-test-helpers";

describe("thread mutation order (#9767)", () => {
  it("shows the status the server ends with after archive, unarchive, archive", async () => {
    let server: "regular" | "archived" = "regular";
    const calls: string[] = [];
    const firstArchive = deferred<void>();
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ remoteId: "a", status: "regular" as const, title: "a" }],
      })),
      archive: vi.fn(async () => {
        calls.push("archive");
        if (calls.length === 1) await firstArchive.promise;
        server = "archived";
      }),
      unarchive: vi.fn(async () => {
        calls.push("unarchive");
        server = "regular";
      }),
    });
    const core = createCore(adapter);
    try {
      await core.getLoadThreadsPromise();
      const first = core.archive("a");
      // runs after the first archive applied its optimistic status, before the second does
      let unarchived: Promise<void> | undefined;
      queueMicrotask(() => {
        unarchived = core.unarchive("a");
      });
      const second = core.archive("a");
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      firstArchive.resolve();
      await Promise.all([first, second, unarchived]);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      // main: archive, archive, unarchive; before #9767: archive, unarchive, archive
      expect({ shown: core.getItemById("a")?.status, calls }).toEqual({
        shown: server,
        calls,
      });
    } finally {
      core.__internal_dispose();
    }
  });
});

import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { flushTapSync, resource, withKey } from "@assistant-ui/tap";
import { AuiConfig, createAssistantClient } from "@assistant-ui/store/client";
import type { RemoteThreadListAdapter } from "../../runtimes/remote-thread-list/types";
import { RemoteThreadList } from "./RemoteThreadList";

// The first archive or delete reducer applied to the thread is the moment the
// operation acts on it; it records which thread was selected at that moment.
const selection = vi.hoisted(() => ({
  current: "initial",
  whenActed: [] as string[],
}));
vi.mock(
  "../../runtimes/remote-thread-list/remote-thread-state",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("../../runtimes/remote-thread-list/remote-thread-state")
      >();
    return {
      ...actual,
      updateStatusReducer: (
        ...args: Parameters<typeof actual.updateStatusReducer>
      ) => {
        if (args[1] === "t1" && args[2] !== "regular") {
          selection.whenActed.push(selection.current);
        }
        return actual.updateStatusReducer(...args);
      },
    };
  },
);

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const stubComposer = { getState: () => ({}) };
const stubSuggestions = { getState: () => ({ suggestions: [] }) };
const useTrackedThread = (props: { threadId: string; alive: Set<string> }) => {
  useEffect(() => {
    const { alive, threadId } = props;
    alive.add(threadId);
    return () => {
      alive.delete(threadId);
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- lifecycle probe tracks the mounted identity
  }, []);
  return {
    getState: () => ({ isRunning: false, messages: [] }),
    composer: () => stubComposer,
    suggestions: () => stubSuggestions,
  };
};
const TrackedThread = resource(useTrackedThread);

const makeAdapter = (unarchive: Promise<void>): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({
    threads: [{ status: "archived" as const, remoteId: "t1", title: "One" }],
  })),
  initialize: vi.fn(async (threadId: string) => ({
    remoteId: threadId,
    externalId: undefined,
  })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(() => unarchive),
  delete: vi.fn(async () => {}),
  generateTitle: vi.fn(async () => new ReadableStream() as never),
  fetch: vi.fn(async (id: string) => ({
    status: "regular" as const,
    remoteId: id,
    externalId: undefined,
    title: id,
  })),
});

// The switch selects the thread a few microtasks after its unarchive settles;
// each offset calls the operation one microtask later, so the sweep covers the
// call that checks before the switch selects the thread and resumes after it.
const MICROTASK_OFFSETS = Array.from({ length: 10 }, (_, offset) => offset);

const switchToArchivedThread = async (backgroundThreads: boolean) => {
  selection.current = "initial";
  selection.whenActed = [];
  const unarchive = deferred<void>();
  const alive = new Set<string>();
  const handle = createAssistantClient(
    AuiConfig({
      threads: RemoteThreadList({
        adapter: makeAdapter(unarchive.promise),
        backgroundThreads,
        thread: (id) =>
          withKey(id, TrackedThread({ threadId: id, alive }) as never),
        onSwitchToThread: (id) => {
          selection.current = id;
        },
        onSwitchToNewThread: () => {
          selection.current = "new";
        },
      }),
    }),
  );
  handle.subscribe(() => {});
  await handle.getClient().threads.getLoadThreadsPromise();
  await vi.waitFor(() => {
    expect(handle.getClient().threads.getState().archivedThreadIds).toEqual([
      "t1",
    ]);
  });
  flushTapSync(() => handle.getClient().threads.switchToThread("t1"));
  await vi.waitFor(() => {
    expect(
      handle.getClient().threads.item({ id: "t1" }).getState().status,
    ).toBe("regular");
  });
  return { handle, alive, settleUnarchive: () => unarchive.resolve() };
};

describe("RemoteThreadList switch to an archived thread", () => {
  it.each(["archive", "delete"] as const)(
    "does not %s the thread while the switch has it selected",
    async (operation) => {
      for (const offset of MICROTASK_OFFSETS) {
        const { handle, settleUnarchive } = await switchToArchivedThread(false);
        settleUnarchive();
        for (let i = 0; i < offset; i++) await Promise.resolve();
        await handle.getClient().threads.item({ id: "t1" })[operation]();

        expect(selection.whenActed).not.toHaveLength(0);
        expect({ offset, selected: selection.whenActed[0] }).not.toEqual({
          offset,
          selected: "t1",
        });
        await vi.waitFor(() => {
          expect(
            handle.getClient().threads.item("main").getState().status,
          ).not.toBe("deleted");
        });
        handle.destroy();
      }
    },
  );

  it("keeps the thread the switch selects mounted when detach runs as it lands", async () => {
    for (const offset of MICROTASK_OFFSETS) {
      const { handle, alive, settleUnarchive } =
        await switchToArchivedThread(true);
      settleUnarchive();
      for (let i = 0; i < offset; i++) await Promise.resolve();
      await handle.getClient().threads.item({ id: "t1" }).detach();

      await vi.waitFor(() => {
        const state = handle.getClient().threads.getState();
        const selected =
          state.mainThreadId === state.newThreadId ? "new" : state.mainThreadId;
        expect({ offset, selected }).toEqual({
          offset,
          selected: selection.current,
        });
        expect(alive.has(state.mainThreadId)).toBe(true);
      });
      handle.destroy();
    }
  });
});

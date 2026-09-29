import { describe, expect, it, vi } from "vitest";
import { resource } from "@assistant-ui/tap";
import { AuiConfig, createAssistantClient } from "@assistant-ui/store/client";
import type { RemoteThreadListAdapter } from "../../runtimes/remote-thread-list/types";
import { RemoteThreadList } from "./RemoteThreadList";

// A loop that never yields cannot be stopped by a timeout, so the test counts
// the lookups it performs and throws once they exceed any finite run.
const lookups = vi.hoisted(() => ({ armed: false, count: 0 }));
vi.mock(
  "../../runtimes/remote-thread-list/remote-thread-state",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("../../runtimes/remote-thread-list/remote-thread-state")
      >();
    return {
      ...actual,
      getThreadData: (...args: Parameters<typeof actual.getThreadData>) => {
        if (lookups.armed && ++lookups.count > 100_000) {
          throw new Error("livelock");
        }
        return actual.getThreadData(...args);
      },
    };
  },
);

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const stubState = { isRunning: false, messages: [] };
const stubComposer = { getState: () => ({}) };
const stubSuggestions = { getState: () => ({ suggestions: [] }) };
const useStubThread = (_props: { threadId: string }) => ({
  getState: () => stubState,
  composer: () => stubComposer,
  suggestions: () => stubSuggestions,
});
const StubThread = resource(useStubThread);

const makeAdapter = (
  overrides: Partial<RemoteThreadListAdapter> = {},
): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({ threads: [] })),
  initialize: vi.fn(async (threadId: string) => ({
    remoteId: threadId,
    externalId: undefined,
  })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  generateTitle: vi.fn(
    async () =>
      new ReadableStream({
        start(controller) {
          controller.close();
        },
      }) as never,
  ),
  fetch: vi.fn(async (id: string) => ({
    status: "regular" as const,
    remoteId: id,
  })),
  ...overrides,
});

describe("RemoteThreadList initialize failure", () => {
  it.each(["archive", "delete", "detach"] as const)(
    "rejects %s of the main thread when its initialize fails instead of looping",
    async (operation) => {
      const initialization = deferred<{
        remoteId: string;
        externalId: undefined;
      }>();
      const adapter = makeAdapter({
        initialize: vi.fn(() => initialization.promise),
      });
      const handle = createAssistantClient(
        AuiConfig({
          threads: RemoteThreadList({
            adapter,
            thread: (id) => StubThread({ threadId: id }) as never,
          }),
        }),
      );
      handle.subscribe(() => {});
      const aui = handle.getClient();
      await aui.threads.getLoadThreadsPromise();
      const localId = aui.threads.getState().mainThreadId;
      const initializing = aui.threads
        .item("main")
        .initialize()
        .catch(() => {});
      await vi.waitFor(() => expect(adapter.initialize).toHaveBeenCalled());

      lookups.count = 0;
      lookups.armed = true;
      try {
        const operating = Promise.resolve(
          aui.threads.item({ id: localId })[operation](),
        );
        initialization.reject(new Error("initialize failed"));
        await initializing;
        await expect(operating).rejects.toThrow(
          "Cannot ensure new thread is not main",
        );
      } finally {
        lookups.armed = false;
      }

      expect(aui.threads.getState().mainThreadId).toBe(localId);
      handle.destroy();
    },
  );
});

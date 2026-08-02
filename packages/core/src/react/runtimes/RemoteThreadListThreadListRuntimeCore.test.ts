import { describe, expect, it, vi } from "vitest";
import type {
  RemoteThreadListAdapter,
  RemoteThreadMetadata,
} from "../../runtimes/remote-thread-list/types";
import { RemoteThreadListThreadListRuntimeCore } from "./RemoteThreadListThreadListRuntimeCore";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const makeThread = (remoteId: string): RemoteThreadMetadata => ({
  status: "regular",
  remoteId,
});

const makeAdapter = (
  threads: RemoteThreadMetadata[],
  overrides: Partial<RemoteThreadListAdapter> = {},
) =>
  ({
    list: vi.fn(async () => ({ threads })),
    rename: vi.fn(async () => {}),
    archive: vi.fn(async () => {}),
    unarchive: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    initialize: vi.fn(async (threadId: string) => ({ remoteId: threadId })),
    generateTitle: vi.fn(async () => {
      throw new Error("not used in this test");
    }),
    fetch: vi.fn(async (threadId: string) => makeThread(threadId)),
    ...overrides,
  }) satisfies RemoteThreadListAdapter;

const makeOptions = (adapter: RemoteThreadListAdapter) => ({
  adapter,
  runtimeHook: () => {
    throw new Error("Runtime hook should not render during this test");
  },
});

const makeCore = (adapter: RemoteThreadListAdapter) =>
  new RemoteThreadListThreadListRuntimeCore(makeOptions(adapter), {
    getModelContext: () => ({}),
  });

describe("RemoteThreadListThreadListRuntimeCore adapter replacement", () => {
  it("removes thread ids belonging to the previous adapter", async () => {
    const adapterA = makeAdapter([makeThread("account-a-thread")]);
    const adapterB = makeAdapter([makeThread("account-b-thread")]);
    const core = makeCore(adapterA);

    await core.getLoadThreadsPromise();
    expect(core.getItemById("account-a-thread")).toBeDefined();

    core.__internal_setOptions(makeOptions(adapterB));
    await core.getLoadThreadsPromise();

    expect(core.threadIds).toEqual(["account-b-thread"]);
    expect(core.getItemById("account-a-thread")).toBeUndefined();
  });

  it("ignores a thread fetched by the previous adapter after replacement", async () => {
    const fetchRequest = deferred<RemoteThreadMetadata>();
    const adapterA = makeAdapter([], {
      fetch: vi.fn(() => fetchRequest.promise),
    });
    const adapterB = makeAdapter([]);
    const core = makeCore(adapterA);

    const switchTask = core.switchToThread("account-a-thread");
    core.__internal_setOptions(makeOptions(adapterB));
    fetchRequest.resolve(makeThread("account-a-thread"));
    await switchTask;

    expect(core.getItemById("account-a-thread")).toBeUndefined();
    expect(adapterB.fetch).not.toHaveBeenCalled();
  });

  it("finishes an in-flight mutation through its originating adapter", async () => {
    const adapterA = makeAdapter([makeThread("account-a-thread")]);
    const adapterB = makeAdapter([]);
    const core = makeCore(adapterA);
    await core.getLoadThreadsPromise();

    const renameTask = core.rename("account-a-thread", "Renamed");
    core.__internal_setOptions(makeOptions(adapterB));
    await renameTask;

    expect(adapterA.rename).toHaveBeenCalledWith("account-a-thread", "Renamed");
    expect(adapterB.rename).not.toHaveBeenCalled();
    expect(core.getItemById("account-a-thread")).toBeUndefined();
  });
});

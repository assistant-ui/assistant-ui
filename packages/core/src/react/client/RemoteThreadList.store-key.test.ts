import { describe, expect, it } from "vitest";
import { flushTapSync, resource } from "@assistant-ui/tap";
import { AuiConfig, createAssistantClient } from "@assistant-ui/store/client";
import type { RemoteThreadListAdapter } from "../../runtimes/remote-thread-list/types";
import { RemoteThreadList } from "./RemoteThreadList";

const stubState = { isRunning: false, messages: [] };
const stubComposer = { getState: () => ({}) };
const stubSuggestions = { getState: () => ({ suggestions: [] }) };
const StubThread = resource((_props: { threadId: string }) => ({
  getState: () => stubState,
  composer: () => stubComposer,
  suggestions: () => stubSuggestions,
}));

type ThreadStatus = "regular" | "archived";
type BackendThread = {
  remoteId: string;
  status: ThreadStatus;
  title: string;
};

type Held = {
  kind: string;
  run: () => unknown;
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
  taken?: boolean;
  value?: unknown;
  error?: unknown;
};

type StoreKey = string | (() => string) | undefined;

const setup = (options: {
  hosted: boolean;
  storeKey?: StoreKey;
  threads?: BackendThread[];
}) => {
  const backend: { threads: BackendThread[]; initializeCount: number } = {
    threads: options.threads ?? [
      { remoteId: "r0", status: "regular", title: "r0" },
    ],
    initializeCount: 0,
  };
  const held: Held[] = [];
  const waiters: { kind: string; resolve: (h: Held) => void }[] = [];
  const take = (h: Held) => {
    h.taken = true;
    return h;
  };
  const request = <T>(kind: string, run: () => T) =>
    new Promise<T>((resolve, reject) => {
      const h: Held = {
        kind,
        run,
        resolve: resolve as (v: unknown) => void,
        reject,
      };
      held.push(h);
      const i = waiters.findIndex((w) => w.kind === kind);
      if (i >= 0) waiters.splice(i, 1)[0]!.resolve(take(h));
    });

  const makeAdapter = (
    storeKey: StoreKey = options.storeKey,
  ): RemoteThreadListAdapter => {
    const adapter = {
      ...(typeof storeKey === "string" ? { storeKey } : {}),
      list: () =>
        request("list", () => ({
          threads: backend.threads.map((t) => ({ ...t })),
        })),
      fetch: async () => {
        throw new Error("not used");
      },
      initialize: () =>
        request("initialize", () => {
          backend.initializeCount += 1;
          const remoteId = `new-${backend.initializeCount}`;
          backend.threads.push({
            remoteId,
            status: "regular",
            title: remoteId,
          });
          return { remoteId, externalId: undefined };
        }),
      archive: (remoteId: string) =>
        request("archive", () => {
          const thread = backend.threads.find((t) => t.remoteId === remoteId);
          if (!thread) throw new Error(`missing ${remoteId}`);
          thread.status = "archived";
        }),
      unarchive: (remoteId: string) =>
        request("unarchive", () => {
          const thread = backend.threads.find((t) => t.remoteId === remoteId);
          if (!thread) throw new Error(`missing ${remoteId}`);
          thread.status = "regular";
        }),
      delete: (remoteId: string) =>
        request("delete", () => {
          backend.threads = backend.threads.filter(
            (t) => t.remoteId !== remoteId,
          );
        }),
      rename: (remoteId: string, newTitle: string) =>
        request("rename", () => {
          const thread = backend.threads.find((t) => t.remoteId === remoteId);
          if (!thread) throw new Error(`missing ${remoteId}`);
          thread.title = newTitle;
        }),
      generateTitle: async () =>
        new ReadableStream({ start: (c) => c.close() }),
    } as RemoteThreadListAdapter;
    if (typeof storeKey === "function") {
      Object.defineProperty(adapter, "storeKey", { get: storeKey });
    }
    return adapter;
  };

  // Resolves once the adapter has been asked for `kind`.
  const requested = (kind: string) => {
    const h = held.find((h) => h.kind === kind && !h.taken);
    if (h) return Promise.resolve(take(h));
    return new Promise<Held>((resolve) => waiters.push({ kind, resolve }));
  };

  // Applies a held request to the backend without answering the client yet.
  const apply = (h: Held) => {
    try {
      h.value = h.run();
    } catch (error) {
      h.error = error;
    }
    return h;
  };
  const run = async (kind: string) => apply(await requested(kind));

  const answer = (h: Held) => {
    if (h.error !== undefined) h.reject(h.error);
    else h.resolve(h.value);
  };

  const fail = (h: Held, error: unknown) => {
    h.error = error;
    h.reject(error);
  };

  let adapter = makeAdapter();
  const listeners = new Set<() => void>();
  const attached = new Set<string>();
  const makeConfig = () =>
    AuiConfig({
      threads: RemoteThreadList({
        adapter,
        thread: (id: string) => StubThread({ threadId: id }) as never,
        ...(options.hosted
          ? {
              backgroundThreads: true,
              __internal_ensureThread: (async (item: { id: string }) => {
                attached.add(item.id);
              }) as never,
              __internal_isThreadAttached: (id: string) => attached.has(id),
              __internal_preserveDraftOnAdapterChange: true,
              __internal_reopenControlledThreadOnAdapterChange: true,
            }
          : {}),
      }),
    });
  let config = makeConfig();
  const handle = createAssistantClient({
    getConfig: () => config,
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  });
  handle.subscribe(() => {});

  const changeAdapter = (nextKey: StoreKey = options.storeKey) => {
    flushTapSync(() => {
      adapter = makeAdapter(nextKey);
      config = makeConfig();
      for (const l of [...listeners]) l();
    });
  };

  const threads = () => handle.getClient().threads;
  const item = (id: string) => threads().item({ id });
  const actions = () => threads().__internal_getRawActions!();
  // Reads after the scheduled tap render has committed the store change.
  const committed = async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    flushTapSync(() => {});
  };
  const statusOf = async (id: string) => {
    await committed();
    return item(id).getState().status;
  };
  const titleOf = async (id: string) => {
    await committed();
    return item(id).getState().title;
  };
  const backendThread = (id: string) =>
    backend.threads.find((t) => t.remoteId === id);
  // The list load currently in flight (started by the adapter-change effect
  // in hosted mode, or by an explicit `reload()`).
  const loaded = () => threads().getLoadThreadsPromise();
  const reload = () => threads().reload();
  const settled = (promise: Promise<unknown>) =>
    promise.then(
      () => undefined,
      (error: unknown) => error,
    );

  return {
    backend,
    run,
    apply,
    answer,
    fail,
    requested,
    changeAdapter,
    currentAdapter: () => adapter,
    item,
    threads,
    actions,
    statusOf,
    titleOf,
    backendThread,
    loaded,
    reload,
    settled,
    handle,
  };
};

const loadRegular = async (t: ReturnType<typeof setup>) => {
  const loading = t.loaded();
  t.answer(await t.run("list"));
  await loading;
};

describe("RemoteThreadList storeKey: in-flight mutations across an adapter change", () => {
  it("hosted: an archive in flight stays archived when a same-store list answers first", async () => {
    const t = setup({ hosted: true, storeKey: "store-a" });
    await loadRegular(t);
    expect(await t.statusOf("r0")).toBe("regular");

    const archived = t.settled(t.actions().archive("r0"));
    const archive = await t.requested("archive");
    expect(await t.statusOf("r0")).toBe("archived");

    t.changeAdapter("store-a");
    const list = await t.run("list");
    const loading = t.loaded();
    t.answer(list);
    await loading;
    t.answer(t.apply(archive));
    expect(await archived).toBeUndefined();

    expect(t.backendThread("r0")?.status).toBe("archived");
    expect(await t.statusOf("r0")).toBe("archived");
    t.handle.destroy();
  });

  it("bare reload: an archive in flight stays archived when a same-store list answers first", async () => {
    const t = setup({ hosted: false, storeKey: "store-a" });
    await loadRegular(t);

    const archived = t.settled(t.actions().archive("r0"));
    const archive = await t.requested("archive");

    t.changeAdapter("store-a");
    const reloading = t.settled(t.reload());
    t.answer(await t.run("list"));
    await reloading;
    t.answer(t.apply(archive));
    expect(await archived).toBeUndefined();

    expect(t.backendThread("r0")?.status).toBe("archived");
    expect(await t.statusOf("r0")).toBe("archived");
    t.handle.destroy();
  });

  it("same-store reload: a completing archive is replayed when the list answers after it", async () => {
    const t = setup({ hosted: false, storeKey: "store-a" });
    await loadRegular(t);

    const archived = t.settled(t.actions().archive("r0"));
    const archive = await t.requested("archive");

    t.changeAdapter("store-a");
    const reloading = t.settled(t.reload());
    const list = await t.run("list");
    t.answer(t.apply(archive));
    expect(await archived).toBeUndefined();
    t.answer(list);
    await reloading;

    expect(t.backendThread("r0")?.status).toBe("archived");
    expect(await t.statusOf("r0")).toBe("archived");
    t.handle.destroy();
  });

  it("keeps a locally initialized thread's remote mapping across a same-store adapter change", async () => {
    const t = setup({ hosted: false, storeKey: "store-a", threads: [] });
    await loadRegular(t);

    const initialize = t.threads().item("main").initialize();
    t.answer(await t.run("initialize"));
    await initialize;

    const remoteId = "new-1";
    expect(await t.statusOf(remoteId)).toBe("regular");

    const archived = t.settled(t.actions().archive(remoteId));
    const archive = await t.requested("archive");

    t.changeAdapter("store-a");
    const reloading = t.settled(t.reload());
    t.answer(await t.run("list"));
    await reloading;
    t.answer(t.apply(archive));
    expect(await archived).toBeUndefined();

    expect(t.backendThread(remoteId)?.status).toBe("archived");
    expect(await t.statusOf(remoteId)).toBe("archived");
    t.handle.destroy();
  });

  it("rolls back a failed same-store archive after the replacement list", async () => {
    const t = setup({ hosted: false, storeKey: "store-a" });
    await loadRegular(t);

    const archived = t.settled(t.actions().archive("r0"));
    const archive = await t.requested("archive");
    expect(await t.statusOf("r0")).toBe("archived");

    t.changeAdapter("store-a");
    const reloading = t.settled(t.reload());
    t.answer(await t.run("list"));
    await reloading;
    expect(await t.statusOf("r0")).toBe("archived");

    const failure = new Error("archive failed");
    t.fail(archive, failure);
    expect(await archived).toBe(failure);

    expect(t.backendThread("r0")?.status).toBe("regular");
    expect(await t.statusOf("r0")).toBe("regular");
    t.handle.destroy();
  });

  it("queues a mutation issued after a same-store adapter change behind one on the same thread", async () => {
    const t = setup({ hosted: false, storeKey: "store-a" });
    await loadRegular(t);

    const archived = t.settled(t.actions().archive("r0"));
    const archive = await t.requested("archive");

    t.changeAdapter("store-a");
    const reloading = t.settled(t.reload());
    t.answer(await t.run("list"));
    await reloading;

    const renamed = t.settled(t.actions().rename("r0", "renamed"));
    expect(await t.statusOf("r0")).toBe("archived");
    expect(await t.titleOf("r0")).toBe("renamed");

    t.answer(t.apply(archive));
    expect(await archived).toBeUndefined();
    t.answer(await t.run("rename"));
    expect(await renamed).toBeUndefined();

    expect(t.backendThread("r0")).toEqual({
      remoteId: "r0",
      status: "archived",
      title: "renamed",
    });
    expect(await t.statusOf("r0")).toBe("archived");
    expect(await t.titleOf("r0")).toBe("renamed");
    t.handle.destroy();
  });

  it("does not apply a late archive from a previous store to a thread id in the new store", async () => {
    const t = setup({ hosted: true, storeKey: "store-a" });
    await loadRegular(t);

    const archived = t.settled(t.actions().archive("r0"));
    const archive = await t.requested("archive");
    expect(await t.statusOf("r0")).toBe("archived");

    t.changeAdapter("store-b");
    const list = await t.run("list");
    const loading = t.loaded();
    t.answer(list);
    await loading;
    expect(await t.statusOf("r0")).toBe("regular");

    t.answer(t.apply(archive));
    await archived;
    expect(await t.statusOf("r0")).toBe("regular");
    t.handle.destroy();
  });

  it("uses the store key captured at load when the previous adapter reads it through a getter", async () => {
    let account = "store-a";
    const t = setup({ hosted: true, storeKey: () => account });
    await loadRegular(t);

    const archived = t.settled(t.actions().archive("r0"));
    const archive = await t.requested("archive");
    expect(await t.statusOf("r0")).toBe("archived");

    account = "store-b";
    t.changeAdapter();
    const list = await t.run("list");
    const loading = t.loaded();
    t.answer(list);
    await loading;
    expect(await t.statusOf("r0")).toBe("regular");

    t.answer(t.apply(archive));
    await archived;
    expect(await t.statusOf("r0")).toBe("regular");
    t.handle.destroy();
  });

  it("resets on a manual reload after the same adapter object's storeKey changed", async () => {
    const t = setup({ hosted: false, storeKey: "store-a" });
    await loadRegular(t);

    const archived = t.settled(t.actions().archive("r0"));
    const archive = await t.requested("archive");
    expect(await t.statusOf("r0")).toBe("archived");

    t.currentAdapter().storeKey = "store-b";
    const reloading = t.settled(t.reload());
    t.answer(await t.run("list"));
    await reloading;
    expect(await t.statusOf("r0")).toBe("regular");

    t.answer(t.apply(archive));
    await archived;
    expect(await t.statusOf("r0")).toBe("regular");
    t.handle.destroy();
  });

  it("settles overlapping rename, delete and unarchive across a same-store adapter change", async () => {
    const t = setup({
      hosted: false,
      storeKey: "store-a",
      threads: [
        { remoteId: "r0", status: "regular", title: "r0" },
        { remoteId: "r1", status: "archived", title: "r1" },
        { remoteId: "r2", status: "regular", title: "r2" },
      ],
    });
    await loadRegular(t);

    const settledAll = Promise.all([
      t.settled(t.actions().rename("r0", "renamed")),
      t.settled(t.actions().unarchive("r1")),
      t.settled(t.actions().delete("r2")),
    ]);
    const rename = await t.requested("rename");
    const unarchive = await t.requested("unarchive");
    const deletion = await t.requested("delete");

    t.changeAdapter("store-a");
    const reloading = t.settled(t.reload());
    t.answer(await t.run("list"));
    await reloading;
    t.answer(t.apply(rename));
    t.answer(t.apply(unarchive));
    t.answer(t.apply(deletion));
    expect(await settledAll).toEqual([undefined, undefined, undefined]);

    expect(t.backendThread("r0")?.title).toBe("renamed");
    expect(t.backendThread("r1")?.status).toBe("regular");
    expect(t.backendThread("r2")).toBeUndefined();
    expect(await t.titleOf("r0")).toBe("renamed");
    expect(await t.statusOf("r1")).toBe("regular");
    await expect(t.statusOf("r2")).rejects.toThrow();
    t.handle.destroy();
  });

  it("treats a recreated adapter without storeKey as a different store", async () => {
    const t = setup({ hosted: true });
    await loadRegular(t);

    const archived = t.settled(t.actions().archive("r0"));
    const archive = await t.requested("archive");
    expect(await t.statusOf("r0")).toBe("archived");

    t.changeAdapter();
    const list = await t.run("list");
    const loading = t.loaded();
    t.answer(list);
    await loading;
    t.answer(t.apply(archive));
    await archived;

    expect(await t.statusOf("r0")).toBe("regular");
    t.handle.destroy();
  });
});

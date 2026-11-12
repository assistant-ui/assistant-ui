import { describe, expect, it } from "vitest";
import { resource } from "@assistant-ui/tap";
import { AuiConfig, createAssistantClient } from "@assistant-ui/store/client";
import type { RemoteThreadListAdapter } from "../../runtimes/remote-thread-list/types";
import { RemoteThreadList } from "./RemoteThreadList";

const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
};

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
  done?: boolean;
  value?: unknown;
  error?: unknown;
};

const setup = (options: {
  hosted: boolean;
  storeKey?: string;
  threads?: BackendThread[];
}) => {
  const backend: { threads: BackendThread[]; initializeCount: number } = {
    threads: options.threads ?? [
      { remoteId: "r0", status: "regular", title: "r0" },
    ],
    initializeCount: 0,
  };
  const held: Held[] = [];
  const request = <T>(kind: string, run: () => T) =>
    new Promise<T>((resolve, reject) => {
      held.push({
        kind,
        run,
        resolve: resolve as (v: unknown) => void,
        reject,
      });
    });

  const makeAdapter = (storeKey = options.storeKey): RemoteThreadListAdapter =>
    ({
      ...(storeKey !== undefined ? { storeKey } : {}),
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
    }) as RemoteThreadListAdapter;

  const heldOf = (kind: string) => {
    const i = held.findIndex((h) => h.kind === kind && !h.done);
    if (i < 0) throw new Error(`no held ${kind}`);
    return held[i]!;
  };

  const run = (kind: string) => {
    const h = heldOf(kind);
    try {
      h.value = h.run();
      h.done = true;
    } catch (error) {
      h.error = error;
      h.done = true;
    }
    return h;
  };

  const answer = (h: Held) => {
    if (h.error !== undefined) h.reject(h.error);
    else h.resolve(h.value);
  };

  const fail = (h: Held, error: unknown) => {
    h.done = true;
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

  const changeAdapter = (nextKey = options.storeKey) => {
    adapter = makeAdapter(nextKey);
    config = makeConfig();
    for (const l of [...listeners]) l();
  };

  const item = (id: string) => handle.getClient().threads.item({ id });
  const actions = () => handle.getClient().threads.__internal_getRawActions!();
  const statusOf = (id: string) => item(id).getState().status;
  const titleOf = (id: string) => item(id).getState().title;
  const backendThread = (id: string) =>
    backend.threads.find((t) => t.remoteId === id);

  return {
    backend,
    run,
    heldOf,
    answer,
    fail,
    changeAdapter,
    item,
    actions,
    statusOf,
    titleOf,
    backendThread,
    handle,
    makeAdapter,
  };
};

const loadRegular = async (t: ReturnType<typeof setup>) => {
  await flush();
  t.answer(t.run("list"));
  await flush();
};

describe("RemoteThreadList storeKey: in-flight mutations across an adapter change", () => {
  it("hosted: an archive in flight stays archived when a same-store list answers first", async () => {
    const t = setup({ hosted: true, storeKey: "store-a" });
    await loadRegular(t);
    expect(t.statusOf("r0")).toBe("regular");

    void t
      .actions()
      .archive("r0")
      .catch(() => {});
    await flush();
    expect(t.statusOf("r0")).toBe("archived");

    t.changeAdapter("store-a");
    await flush();

    const list = t.run("list");
    const archive = t.run("archive");
    t.answer(list);
    await flush();
    t.answer(archive);
    await flush();

    expect(t.backendThread("r0")?.status).toBe("archived");
    expect(t.statusOf("r0")).toBe("archived");
    t.handle.destroy();
  });

  it("bare reload: an archive in flight stays archived when a same-store list answers first", async () => {
    const t = setup({ hosted: false, storeKey: "store-a" });
    await loadRegular(t);

    void t
      .actions()
      .archive("r0")
      .catch(() => {});
    await flush();

    t.changeAdapter("store-a");
    await flush();
    void t.handle
      .getClient()
      .threads.reload()
      .catch(() => {});
    await flush();

    const list = t.run("list");
    const archive = t.run("archive");
    t.answer(list);
    await flush();
    t.answer(archive);
    await flush();

    expect(t.backendThread("r0")?.status).toBe("archived");
    expect(t.statusOf("r0")).toBe("archived");
    t.handle.destroy();
  });

  it("same-store reload: a completing archive is replayed when the list answers after it", async () => {
    const t = setup({ hosted: false, storeKey: "store-a" });
    await loadRegular(t);

    void t
      .actions()
      .archive("r0")
      .catch(() => {});
    await flush();

    t.changeAdapter("store-a");
    await flush();
    void t.handle
      .getClient()
      .threads.reload()
      .catch(() => {});
    await flush();

    const list = t.run("list");
    const archive = t.run("archive");
    t.answer(archive);
    await flush();
    t.answer(list);
    await flush();

    expect(t.backendThread("r0")?.status).toBe("archived");
    expect(t.statusOf("r0")).toBe("archived");
    t.handle.destroy();
  });

  it("keeps a locally initialized thread's remote mapping across a same-store adapter change", async () => {
    const t = setup({ hosted: false, storeKey: "store-a", threads: [] });
    await loadRegular(t);

    const initialize = t.handle.getClient().threads.item("main").initialize();
    await flush();
    t.answer(t.run("initialize"));
    await initialize;
    await flush();

    const remoteId = "new-1";
    expect(t.statusOf(remoteId)).toBe("regular");

    void t
      .actions()
      .archive(remoteId)
      .catch(() => {});
    await flush();

    t.changeAdapter("store-a");
    await flush();
    void t.handle
      .getClient()
      .threads.reload()
      .catch(() => {});
    await flush();

    const list = t.run("list");
    const archive = t.run("archive");
    t.answer(list);
    await flush();
    t.answer(archive);
    await flush();

    expect(t.backendThread(remoteId)?.status).toBe("archived");
    expect(t.statusOf(remoteId)).toBe("archived");
    t.handle.destroy();
  });

  it("rolls back a failed same-store archive after the replacement list", async () => {
    const t = setup({ hosted: false, storeKey: "store-a" });
    await loadRegular(t);

    const archived = t.actions().archive("r0");
    void archived.catch(() => {});
    await flush();
    expect(t.statusOf("r0")).toBe("archived");

    t.changeAdapter("store-a");
    await flush();
    void t.handle
      .getClient()
      .threads.reload()
      .catch(() => {});
    await flush();

    const list = t.run("list");
    t.answer(list);
    await flush();
    t.fail(t.heldOf("archive"), new Error("archive failed"));
    await expect(archived).rejects.toThrow("archive failed");
    await flush();

    expect(t.backendThread("r0")?.status).toBe("regular");
    expect(t.statusOf("r0")).toBe("regular");
    t.handle.destroy();
  });

  it("does not apply a late archive from a previous store to a thread id in the new store", async () => {
    const t = setup({ hosted: true, storeKey: "store-a" });
    await loadRegular(t);

    void t
      .actions()
      .archive("r0")
      .catch(() => {});
    await flush();
    expect(t.statusOf("r0")).toBe("archived");

    t.changeAdapter("store-b");
    await flush();

    const list = t.run("list");
    t.answer(list);
    await flush();

    expect(t.statusOf("r0")).toBe("regular");

    const archive = t.run("archive");
    t.answer(archive);
    await flush();

    expect(t.statusOf("r0")).toBe("regular");
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

    void t
      .actions()
      .rename("r0", "renamed")
      .catch(() => {});
    void t
      .actions()
      .unarchive("r1")
      .catch(() => {});
    void t
      .actions()
      .delete("r2")
      .catch(() => {});
    await flush();

    t.changeAdapter("store-a");
    await flush();
    void t.handle
      .getClient()
      .threads.reload()
      .catch(() => {});
    await flush();

    const list = t.run("list");
    const rename = t.run("rename");
    const unarchive = t.run("unarchive");
    const deletion = t.run("delete");
    t.answer(list);
    await flush();
    t.answer(rename);
    t.answer(unarchive);
    t.answer(deletion);
    await flush();

    expect(t.backendThread("r0")?.title).toBe("renamed");
    expect(t.backendThread("r1")?.status).toBe("regular");
    expect(t.backendThread("r2")).toBeUndefined();
    expect(t.titleOf("r0")).toBe("renamed");
    expect(t.statusOf("r1")).toBe("regular");
    expect(() => t.statusOf("r2")).toThrow();
    t.handle.destroy();
  });

  it("treats a recreated adapter without storeKey as a different store", async () => {
    const t = setup({ hosted: true });
    await loadRegular(t);

    void t
      .actions()
      .archive("r0")
      .catch(() => {});
    await flush();
    expect(t.statusOf("r0")).toBe("archived");

    t.changeAdapter();
    await flush();

    const list = t.run("list");
    t.answer(list);
    await flush();
    const archive = t.run("archive");
    t.answer(archive);
    await flush();

    expect(t.statusOf("r0")).toBe("regular");
    t.handle.destroy();
  });
});

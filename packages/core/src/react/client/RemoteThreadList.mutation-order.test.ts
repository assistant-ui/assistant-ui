import { describe, expect, it, vi } from "vitest";
import { flushTapSync, resource } from "@assistant-ui/tap";
import { AuiConfig, createAssistantClient } from "@assistant-ui/store/client";
import type { RemoteThreadListAdapter } from "../../runtimes/remote-thread-list/types";
import {
  RemoteThreadList,
  type RemoteThreadListProps,
} from "./RemoteThreadList";

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const threadState = { isRunning: false, messages: [] };
const composer = { getState: () => ({}) };
const suggestions = { getState: () => ({ suggestions: [] }) };
const StubThread = resource(() => ({
  getState: () => threadState,
  composer: () => composer,
  suggestions: () => suggestions,
}));

const mount = async (
  overrides: Partial<RemoteThreadListAdapter> = {},
  options: Partial<RemoteThreadListProps> = {},
) => {
  const adapter: RemoteThreadListAdapter = {
    list: vi.fn(async () => ({
      threads: ["a", "b"].map((remoteId) => ({
        remoteId,
        status: "regular" as const,
        title: remoteId,
      })),
    })),
    initialize: vi.fn(async (id: string) => ({ remoteId: id, externalId: id })),
    rename: vi.fn(async () => {}),
    archive: vi.fn(async () => {}),
    unarchive: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    fetch: vi.fn(async (id: string) => ({
      remoteId: id,
      status: "regular" as const,
    })),
    generateTitle: vi.fn(async () => new ReadableStream() as never),
    ...overrides,
  };
  let currentAdapter = adapter;
  const listeners = new Set<() => void>();
  const handle = createAssistantClient({
    getConfig: () =>
      AuiConfig({
        threads: RemoteThreadList({
          adapter: currentAdapter,
          thread: () => StubThread() as never,
          ...options,
        }),
      }),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  });
  handle.subscribe(() => {});
  const threads = handle.getClient().threads;
  await threads.getLoadThreadsPromise();
  const setAdapter = (nextAdapter: RemoteThreadListAdapter) => {
    flushTapSync(() => {
      currentAdapter = nextAdapter;
      for (const listener of listeners) listener();
    });
  };
  return { adapter, handle, threads, setAdapter };
};

describe("RemoteThreadList thread mutations", () => {
  it.each(["resolve", "reject"] as const)(
    "preserves rename order after a fallback switch rejects and the predecessor %ss",
    async (settlement) => {
      const first = deferred();
      const started = deferred();
      const failure = new Error("fallback failed");
      const renameFailure = new Error("rename failed");
      let serverTitle = "a";
      const { adapter, handle, threads } = await mount(
        {
          rename: vi.fn(async (_: string, title: string) => {
            if (title === "First") {
              started.resolve();
              await first.promise;
            }
            serverTitle = title;
          }),
        },
        {
          onSwitchToNewThread: () => {
            throw failure;
          },
        },
      );
      const actions = threads.__internal_getRawActions!();
      try {
        await actions.switchToThread("a");
        flushTapSync(() => {});
        const firstRename = actions.rename("a", "First");
        const firstResult = firstRename.catch((error: unknown) => error);
        await started.promise;
        const archiving = actions.archive("a");
        const archiveResult = archiving.catch((error: unknown) => error);
        const lastRename = actions.rename("a", "Last");
        expect(await archiveResult).toBe(failure);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        expect(adapter.rename).toHaveBeenCalledTimes(1);
        expect(adapter.archive).not.toHaveBeenCalled();
        if (settlement === "resolve") first.resolve();
        else first.reject(renameFailure);
        expect(await firstResult).toBe(
          settlement === "reject" ? renameFailure : undefined,
        );
        await lastRename;
        flushTapSync(() => {});
        expect(threads.item({ id: "a" }).getState().title).toBe("Last");
        expect(serverTitle).toBe(threads.item({ id: "a" }).getState().title);
      } finally {
        handle.destroy();
      }
    },
  );

  it.each([
    ["resolve", "before"],
    ["resolve", "after"],
    ["reject", "before"],
    ["reject", "after"],
  ] as const)(
    "preserves rename order when the predecessor %ss and the last rename is queued %s identity reconciliation",
    async (settlement, timing) => {
      const initialization = deferred();
      const first = deferred();
      const started = deferred();
      const failure = new Error("rename failed");
      let serverTitle = "a";
      const { adapter, handle, threads } = await mount({
        list: vi.fn(async () => ({ threads: [] })),
        initialize: vi.fn(async () => {
          await initialization.promise;
          return { remoteId: "a", externalId: undefined };
        }),
        rename: vi.fn(async (_: string, title: string) => {
          if (title === "First") {
            started.resolve();
            await first.promise;
          }
          serverTitle = title;
        }),
      });
      const actions = threads.__internal_getRawActions!();
      try {
        const draftId = threads.getState().mainThreadId;
        const initializing = threads.item("main").initialize();
        adapter.list = vi.fn(async () => ({
          threads: [{ remoteId: "a", status: "regular" as const, title: "a" }],
        }));
        await threads.reload();
        const firstRename = actions.rename("a", "First");
        const firstResult = firstRename.catch((error: unknown) => error);
        await started.promise;
        const middleRename =
          timing === "before" ? actions.rename("a", "Middle") : undefined;
        let lastRename =
          timing === "before" ? actions.rename(draftId, "Last") : undefined;
        initialization.resolve();
        await initializing;
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        flushTapSync(() => {});
        expect(threads.item({ id: "a" }).getState().id).toBe(draftId);
        lastRename ??= actions.rename(draftId, "Last");
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        expect(adapter.rename).toHaveBeenCalledTimes(1);
        if (settlement === "resolve") first.resolve();
        else first.reject(failure);
        expect(await firstResult).toBe(
          settlement === "reject" ? failure : undefined,
        );
        await Promise.all([middleRename, lastRename]);
        flushTapSync(() => {});
        expect(
          vi.mocked(adapter.rename).mock.calls.map(([, title]) => title),
        ).toEqual(
          timing === "before" ? ["First", "Middle", "Last"] : ["First", "Last"],
        );
        expect(threads.item({ id: draftId }).getState().title).toBe("Last");
        expect(threads.item({ id: "a" }).getState().title).toBe("Last");
        expect(serverTitle).toBe(
          threads.item({ id: draftId }).getState().title,
        );
      } finally {
        handle.destroy();
      }
    },
  );

  it("sends archive before unarchive while showing the last optimistic action", async () => {
    const first = deferred();
    let serverStatus = "regular";
    const { adapter, handle, threads } = await mount({
      archive: vi.fn(async () => {
        await first.promise;
        serverStatus = "archived";
      }),
      unarchive: vi.fn(async () => {
        serverStatus = "regular";
      }),
    });
    try {
      threads.item({ id: "a" }).archive();
      await vi.waitFor(() => expect(adapter.archive).toHaveBeenCalledWith("a"));
      threads.item({ id: "a" }).unarchive();
      await vi.waitFor(() =>
        expect(threads.item({ id: "a" }).getState().status).toBe("regular"),
      );
      await Promise.resolve();
      expect(adapter.unarchive).not.toHaveBeenCalled();
      first.resolve();
      await vi.waitFor(() =>
        expect(adapter.unarchive).toHaveBeenCalledWith("a"),
      );
      expect(serverStatus).toBe("regular");
      expect(threads.item({ id: "a" }).getState().status).toBe("regular");
    } finally {
      handle.destroy();
    }
  });

  it("shows the server status after archive, unarchive, archive", async () => {
    let server: "regular" | "archived" = "regular";
    const calls: string[] = [];
    const firstArchive = deferred();
    const { handle, threads } = await mount({
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
    const actions = threads.__internal_getRawActions!();
    try {
      const first = actions.archive("a");
      let unarchived: Promise<void> | undefined;
      queueMicrotask(() => {
        unarchived = actions.unarchive("a");
      });
      const second = actions.archive("a");
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      firstArchive.resolve();
      await Promise.all([first, second, unarchived!]);
      flushTapSync(() => {});
      expect(calls).toEqual(["archive", "archive", "unarchive"]);
      expect({
        shown: threads.item({ id: "a" }).getState().status,
        server,
        calls,
      }).toEqual({
        shown: "regular",
        server: "regular",
        calls: ["archive", "archive", "unarchive"],
      });
    } finally {
      handle.destroy();
    }
  });

  it("sends mutations for different threads concurrently", async () => {
    const first = deferred();
    const { adapter, handle, threads } = await mount({
      rename: vi.fn((id: string) =>
        id === "a" ? first.promise : Promise.resolve(),
      ),
    });
    try {
      threads.item({ id: "a" }).rename("A");
      await vi.waitFor(() =>
        expect(adapter.rename).toHaveBeenCalledWith("a", "A"),
      );
      threads.item({ id: "b" }).rename("B");
      await vi.waitFor(() =>
        expect(adapter.rename).toHaveBeenCalledWith("b", "B"),
      );
      first.resolve();
    } finally {
      handle.destroy();
    }
  });

  it.each(["pending", "settled"] as const)(
    "isolates mutation queues after an adapter swap when the previous request is %s",
    async (previousState) => {
      const previous = deferred();
      const current = deferred();
      const { adapter, handle, threads, setAdapter } = await mount({
        rename: vi.fn(() => previous.promise),
      });
      const replacement = {
        ...adapter,
        rename: vi.fn((_: string, title: string) =>
          title === "Current" ? current.promise : Promise.resolve(),
        ),
      };
      try {
        const previousMutation = threads.item({ id: "a" }).rename("Previous");
        await vi.waitFor(() =>
          expect(adapter.rename).toHaveBeenCalledWith("a", "Previous"),
        );

        setAdapter(replacement);
        await threads.reload();
        const currentMutation = threads.item({ id: "a" }).rename("Current");
        await vi.waitFor(() =>
          expect(replacement.rename).toHaveBeenCalledWith("a", "Current"),
        );

        if (previousState === "settled") {
          previous.resolve();
          await previousMutation;
        }

        const queuedMutation = threads.item({ id: "a" }).rename("Queued");
        await vi.waitFor(() =>
          expect(threads.item({ id: "a" }).getState().title).toBe("Queued"),
        );
        expect(replacement.rename).toHaveBeenCalledTimes(1);
        current.resolve();
        await Promise.all([currentMutation, queuedMutation]);
        expect(replacement.rename).toHaveBeenLastCalledWith("a", "Queued");
      } finally {
        handle.destroy();
      }
    },
  );

  it("sends the next mutation after the first rejects", async () => {
    const first = deferred();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { adapter, handle, threads } = await mount({
      rename: vi.fn((_: string, title: string) =>
        title === "First" ? first.promise : Promise.resolve(),
      ),
    });
    try {
      threads.item({ id: "a" }).rename("First");
      await vi.waitFor(() =>
        expect(adapter.rename).toHaveBeenCalledWith("a", "First"),
      );
      threads.item({ id: "a" }).rename("Second");
      await Promise.resolve();
      expect(adapter.rename).toHaveBeenCalledTimes(1);
      first.reject(new Error("failed"));
      await vi.waitFor(() =>
        expect(adapter.rename).toHaveBeenLastCalledWith("a", "Second"),
      );
    } finally {
      handle.destroy();
      errorSpy.mockRestore();
    }
  });
});

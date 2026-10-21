import { describe, expect, it, vi } from "vitest";
import {
  createCore,
  deferred,
  makeAdapter,
  setStartThreadRuntime,
} from "../../tests/remote-thread-list-test-helpers";

const listed = () => ({
  threads: ["a", "b"].map((remoteId) => ({
    remoteId,
    status: "regular" as const,
    title: remoteId,
  })),
});

describe("RemoteThreadListThreadListRuntimeCore thread mutations", () => {
  it.each(["resolve", "reject"] as const)(
    "preserves rename order after a fallback attachment rejects and the predecessor %ss",
    async (settlement) => {
      const first = deferred<void>();
      const started = deferred<void>();
      const attachment = deferred<unknown>();
      const attaching = deferred<void>();
      const failure = new Error("attachment failed");
      const renameFailure = new Error("rename failed");
      let serverTitle = "a";
      const adapter = makeAdapter({
        list: vi.fn(async () => listed()),
        rename: vi.fn(async (_: string, title: string) => {
          if (title === "First") {
            started.resolve();
            await first.promise;
          }
          serverTitle = title;
        }),
      });
      const core = createCore(adapter);
      try {
        await core.getLoadThreadsPromise();
        await core.switchToThread("a");
        setStartThreadRuntime(core, () => {
          attaching.resolve();
          return attachment.promise;
        });
        const firstRename = core.rename("a", "First");
        const firstResult = firstRename.catch((error: unknown) => error);
        await started.promise;
        const archiving = core.archive("a");
        const archiveResult = archiving.catch((error: unknown) => error);
        await attaching.promise;
        const lastRename = core.rename("a", "Last");
        attachment.reject(failure);
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
        expect(core.getItemById("a")?.title).toBe("Last");
        expect(serverTitle).toBe(core.getItemById("a")?.title);
      } finally {
        core.__internal_dispose();
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
      const initialization = deferred<void>();
      const first = deferred<void>();
      const started = deferred<void>();
      const failure = new Error("rename failed");
      let serverTitle = "a";
      const adapter = makeAdapter({
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
      const core = createCore(adapter);
      try {
        await core.getLoadThreadsPromise();
        const draftId = core.mainThreadId;
        const initializing = core.initialize(draftId);
        adapter.list = vi.fn(async () => ({
          threads: [{ remoteId: "a", status: "regular" as const, title: "a" }],
        }));
        await core.reload();
        const firstRename = core.rename("a", "First");
        const firstResult = firstRename.catch((error: unknown) => error);
        await started.promise;
        const middleRename =
          timing === "before" ? core.rename("a", "Middle") : undefined;
        let lastRename =
          timing === "before" ? core.rename(draftId, "Last") : undefined;
        initialization.resolve();
        await initializing;
        expect(core.getItemById("a")?.id).toBe(draftId);
        lastRename ??= core.rename(draftId, "Last");
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        expect(adapter.rename).toHaveBeenCalledTimes(1);
        if (settlement === "resolve") first.resolve();
        else first.reject(failure);
        expect(await firstResult).toBe(
          settlement === "reject" ? failure : undefined,
        );
        await Promise.all([middleRename, lastRename]);
        expect(
          vi.mocked(adapter.rename).mock.calls.map(([, title]) => title),
        ).toEqual(
          timing === "before" ? ["First", "Middle", "Last"] : ["First", "Last"],
        );
        expect(core.getItemById(draftId)?.title).toBe("Last");
        expect(core.getItemById("a")?.title).toBe("Last");
        expect(serverTitle).toBe(core.getItemById(draftId)?.title);
      } finally {
        core.__internal_dispose();
      }
    },
  );

  it("sends archive before unarchive while showing the last optimistic action", async () => {
    const first = deferred<void>();
    let serverStatus = "regular";
    const adapter = makeAdapter({
      list: vi.fn(async () => listed()),
      archive: vi.fn(async () => {
        await first.promise;
        serverStatus = "archived";
      }),
      unarchive: vi.fn(async () => {
        serverStatus = "regular";
      }),
    });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();
    const archiving = core.archive("a");
    await vi.waitFor(() => expect(adapter.archive).toHaveBeenCalledWith("a"));
    const unarchiving = core.unarchive("a");
    expect(core.getItemById("a")?.status).toBe("regular");
    await Promise.resolve();
    expect(adapter.unarchive).not.toHaveBeenCalled();
    first.resolve();
    await Promise.all([archiving, unarchiving]);
    expect(adapter.unarchive).toHaveBeenCalledWith("a");
    expect(serverStatus).toBe("regular");
    expect(core.getItemById("a")?.status).toBe("regular");
  });

  it("sends mutations for different threads concurrently", async () => {
    const first = deferred<void>();
    const adapter = makeAdapter({
      list: vi.fn(async () => listed()),
      rename: vi.fn((id: string) =>
        id === "a" ? first.promise : Promise.resolve(),
      ),
    });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();
    const a = core.rename("a", "A");
    await vi.waitFor(() =>
      expect(adapter.rename).toHaveBeenCalledWith("a", "A"),
    );
    const b = core.rename("b", "B");
    await b;
    expect(adapter.rename).toHaveBeenCalledWith("b", "B");
    first.resolve();
    await a;
  });

  it.each(["pending", "settled"] as const)(
    "isolates mutation queues after an adapter swap when the previous request is %s",
    async (previousState) => {
      const previous = deferred<void>();
      const current = deferred<void>();
      const adapter = makeAdapter({
        list: vi.fn(async () => listed()),
        rename: vi.fn(() => previous.promise),
      });
      const replacement = makeAdapter({
        list: vi.fn(async () => listed()),
        rename: vi.fn((_: string, title: string) =>
          title === "Current" ? current.promise : Promise.resolve(),
        ),
      });
      const core = createCore(adapter);
      await core.getLoadThreadsPromise();
      const previousMutation = core.rename("a", "Previous");
      await vi.waitFor(() =>
        expect(adapter.rename).toHaveBeenCalledWith("a", "Previous"),
      );

      core.__internal_setOptions({
        adapter: replacement,
        runtimeHook: () => ({}) as never,
      });
      await core.getLoadThreadsPromise();
      const currentMutation = core.rename("a", "Current");
      await vi.waitFor(() =>
        expect(replacement.rename).toHaveBeenCalledWith("a", "Current"),
      );

      if (previousState === "settled") {
        previous.resolve();
        await previousMutation;
      }

      const queuedMutation = core.rename("a", "Queued");
      await Promise.resolve();
      expect(replacement.rename).toHaveBeenCalledTimes(1);
      current.resolve();
      await Promise.all([currentMutation, queuedMutation]);
      expect(replacement.rename).toHaveBeenLastCalledWith("a", "Queued");
    },
  );

  it("sends the next mutation after the first rejects", async () => {
    const first = deferred<void>();
    const adapter = makeAdapter({
      list: vi.fn(async () => listed()),
      rename: vi.fn((_: string, title: string) =>
        title === "First" ? first.promise : Promise.resolve(),
      ),
    });
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();
    const a = core.rename("a", "First");
    const rejected = a.catch((error: unknown) => error);
    await vi.waitFor(() =>
      expect(adapter.rename).toHaveBeenCalledWith("a", "First"),
    );
    const b = core.rename("a", "Second");
    await Promise.resolve();
    expect(adapter.rename).toHaveBeenCalledTimes(1);
    first.reject(new Error("failed"));
    expect(await rejected).toHaveProperty("message", "failed");
    await b;
    expect(adapter.rename).toHaveBeenLastCalledWith("a", "Second");
  });
});

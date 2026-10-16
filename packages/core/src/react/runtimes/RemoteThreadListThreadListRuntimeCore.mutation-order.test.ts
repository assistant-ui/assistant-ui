import { describe, expect, it, vi } from "vitest";
import {
  createCore,
  deferred,
  makeAdapter,
} from "../../tests/remote-thread-list-test-helpers";

const listed = () => ({
  threads: ["a", "b"].map((remoteId) => ({
    remoteId,
    status: "regular" as const,
    title: remoteId,
  })),
});

describe("RemoteThreadListThreadListRuntimeCore thread mutations", () => {
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

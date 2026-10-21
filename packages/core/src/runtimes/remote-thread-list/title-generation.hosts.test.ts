import { describe, expect, it, vi } from "vitest";
import { flushTapSync, resource } from "@assistant-ui/tap";
import { AuiConfig, createAssistantClient } from "@assistant-ui/store/client";
import { RemoteThreadList } from "../../react/client/RemoteThreadList";
import {
  createCore,
  deferred,
  makeAdapter,
} from "../../tests/remote-thread-list-test-helpers";
import type { RemoteThreadListAdapter } from "./types";

const threadState = { isRunning: false, messages: [] };
const composer = { getState: () => ({}) };
const suggestions = { getState: () => ({ suggestions: [] }) };
const StubThread = resource(function useStubThread() {
  return {
    getState: () => threadState,
    composer: () => composer,
    suggestions: () => suggestions,
  };
});

const mountHost = async (
  kind: "runtime" | "client",
  adapter: RemoteThreadListAdapter,
) => {
  if (kind === "runtime") {
    const core = createCore(adapter);
    await core.getLoadThreadsPromise();
    (
      core as unknown as {
        _hookManager: { getThreadRuntimeCore: () => unknown };
      }
    )._hookManager.getThreadRuntimeCore = () => threadState;
    return {
      generate: () => core.generateTitle("t1", { automatic: true }),
      rename: () => core.rename("t1", "Winner"),
      delete: () => core.delete("t1"),
      title: () => core.getItemById("t1")?.title,
      setAdapter: async (next: RemoteThreadListAdapter) => {
        core.__internal_setOptions({
          adapter: next,
          runtimeHook: () => ({}) as never,
        });
        await core.getLoadThreadsPromise();
      },
      destroy: () => core.__internal_dispose(),
    };
  }
  let currentAdapter = adapter;
  const listeners = new Set<() => void>();
  const handle = createAssistantClient({
    getConfig: () =>
      AuiConfig({
        threads: RemoteThreadList({
          adapter: currentAdapter,
          backgroundThreads: true,
          thread: () => StubThread() as never,
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
  const actions = threads.__internal_getRawActions!();
  return {
    generate: () => actions.generateTitle("t1", [], { automatic: true }),
    rename: () => actions.rename("t1", "Winner"),
    delete: () => actions.delete("t1"),
    title: () => {
      flushTapSync(() => {});
      return threads.getState().threadIds.includes("t1")
        ? threads.item({ id: "t1" }).getState().title
        : undefined;
    },
    setAdapter: async (next: RemoteThreadListAdapter) => {
      flushTapSync(() => {
        currentAdapter = next;
        for (const listener of listeners) listener();
      });
      await threads.reload();
    },
    destroy: () => handle.destroy(),
  };
};

describe.each(["runtime", "client"] as const)(
  "%s title reconciliation",
  (kind) => {
    it.each([
      "server title",
      "read failure",
      "adapter change before read",
      "adapter change during read",
      "deletion during read",
    ] as const)("handles %s after a failed reassertion", async (scenario) => {
      const error = new Error("write-back failed");
      const stream = deferred<ReadableStream>();
      const generating = deferred<void>();
      const pending = deferred<void>();
      const release = deferred<void>();
      let serverTitle = "Initial";
      const adapter = makeAdapter({
        list: vi.fn(async () => ({
          threads: [
            { remoteId: "t1", status: "regular" as const, title: serverTitle },
          ],
        })),
        generateTitle: vi.fn(async () => {
          generating.resolve();
          return stream.promise as never;
        }),
        rename: vi.fn(async (_id, title) => {
          serverTitle = title;
        }),
        fetch: vi.fn(async (remoteId) => {
          const title = serverTitle;
          if (scenario === "read failure") throw new Error("read failed");
          if (scenario.endsWith("during read")) {
            pending.resolve();
            await release.promise;
          }
          return { remoteId, status: "regular" as const, title };
        }),
      });
      const host = await mountHost(kind, adapter);
      try {
        const generation = host.generate();
        const rejected = expect(generation).rejects.toBe(error);
        await generating.promise;
        await host.rename();
        vi.mocked(adapter.rename).mockImplementation(async () => {
          serverTitle = "Server title";
          if (scenario === "adapter change before read") {
            pending.resolve();
            await release.promise;
          }
          throw error;
        });
        stream.resolve(
          new ReadableStream({
            start(controller) {
              serverTitle = "Generated";
              controller.enqueue({
                type: "part-start",
                path: [0],
                part: { type: "text" },
              });
              controller.enqueue({
                type: "text-delta",
                path: [0],
                textDelta: "Generated",
              });
              controller.enqueue({ type: "part-finish", path: [0] });
              controller.close();
            },
          }),
        );
        if (scenario.startsWith("adapter change")) {
          await pending.promise;
          const replacement = makeAdapter({
            list: vi.fn(async () => ({
              threads: [
                { remoteId: "t1", status: "regular" as const, title: "New" },
              ],
            })),
          });
          await host.setAdapter(replacement);
          release.resolve();
          await rejected;
          await vi.waitFor(() => expect(host.title()).toBe("New"));
          expect(replacement.fetch).not.toHaveBeenCalled();
          expect(replacement.rename).not.toHaveBeenCalled();
        } else if (scenario === "deletion during read") {
          await pending.promise;
          await host.delete();
          release.resolve();
          await rejected;
          await vi.waitFor(() => expect(host.title()).toBeUndefined());
        } else {
          await rejected;
          await vi.waitFor(() =>
            expect(host.title()).toBe(
              scenario === "read failure" ? "Winner" : serverTitle,
            ),
          );
        }
        expect(adapter.rename).toHaveBeenCalledTimes(2);
        expect(adapter.rename).toHaveBeenNthCalledWith(2, "t1", "Winner");
        if (scenario === "adapter change before read") {
          expect(adapter.fetch).not.toHaveBeenCalled();
        } else {
          expect(adapter.fetch).toHaveBeenCalledExactlyOnceWith("t1");
        }
      } finally {
        host.destroy();
      }
    });
  },
);

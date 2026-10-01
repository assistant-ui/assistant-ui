// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAui, useAuiState, type AssistantClient } from "@assistant-ui/store";
import { Suspense, use, useEffect, useState, type ReactNode } from "react";
import {
  deferred,
  makeAdapter,
} from "../../tests/remote-thread-list-test-helpers";
import type { RemoteThreadListAdapter } from "../../runtimes/remote-thread-list/types";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";

const EMPTY_MESSAGES: readonly never[] = [];

type ListPage = Awaited<ReturnType<RemoteThreadListAdapter["list"]>>;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const useThreadRuntime = () =>
  useExternalStoreRuntime({
    messages: EMPTY_MESSAGES,
    onNew: async () => {},
  } as never);

const mount = async (
  adapter: RemoteThreadListAdapter,
  children: ReactNode = null,
) => {
  let client: AssistantClient | undefined;
  const Capture = () => {
    const aui = useAui();
    useEffect(() => {
      client = aui;
    }, [aui]);
    return null;
  };

  const App = () => {
    const runtime = useRemoteThreadListRuntime({
      adapter,
      runtimeHook: useThreadRuntime,
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Capture />
        {children}
      </AssistantRuntimeProvider>
    );
  };

  render(<App />);
  await waitFor(() => expect(client).toBeDefined());
  return client!;
};

describe("useRemoteThreadListRuntime list promises", () => {
  it("resolve after the threads client reports the loaded list", async () => {
    const list = deferred<ListPage>();
    const adapter = makeAdapter({ list: vi.fn(() => list.promise) });
    const aui = await mount(adapter);
    expect(aui.threads().getState().isLoading).toBe(true);

    const loaded = aui.threads().getLoadThreadsPromise();
    list.resolve({
      threads: [{ remoteId: "t1", status: "regular", title: "One" }],
    });
    await loaded;

    expect(aui.threads().getState().isLoading).toBe(false);
    expect(aui.threads().getState().threadIds).toEqual(["t1"]);

    vi.mocked(adapter.list).mockResolvedValueOnce({
      threads: [
        { remoteId: "t1", status: "regular", title: "One" },
        { remoteId: "t2", status: "regular", title: "Two" },
      ],
    });
    await aui.threads().reload();

    expect(aui.threads().getState().threadIds).toEqual(["t1", "t2"]);
  });

  it("returns one promise per load", async () => {
    const list = deferred<ListPage>();
    const adapter = makeAdapter({ list: vi.fn(() => list.promise) });
    const aui = await mount(adapter);

    const first = aui.threads().getLoadThreadsPromise();
    expect(aui.threads().getLoadThreadsPromise()).toBe(first);
    list.resolve({ threads: [] });
    await first;
    expect(aui.threads().getLoadThreadsPromise()).toBe(first);

    const reloaded = aui.threads().reload();
    expect(reloaded).not.toBe(first);
    expect(aui.threads().getLoadThreadsPromise()).toBe(reloaded);
    await reloaded;
  });

  it("suspends a use() reader of the load promise until the list is loaded", async () => {
    const list = deferred<ListPage>();
    const adapter = makeAdapter({ list: vi.fn(() => list.promise) });
    const consoleError = vi.spyOn(console, "error");
    const Threads = () => {
      const aui = useAui();
      use(aui.threads().getLoadThreadsPromise());
      const ids = useAuiState((s) => s.threads.threadIds);
      return <p>{ids.join(",")}</p>;
    };

    await mount(
      adapter,
      <Suspense fallback={<p>loading</p>}>
        <Threads />
      </Suspense>,
    );
    expect(screen.getByText("loading")).toBeDefined();

    list.resolve({
      threads: [{ remoteId: "t1", status: "regular", title: "One" }],
    });

    expect(await screen.findByText("t1")).toBeDefined();
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("uncached promise"),
    );
  });

  it("settles a suspense cache keyed on the load promise", async () => {
    const list = deferred<ListPage>();
    const adapter = makeAdapter({ list: vi.fn(() => list.promise) });
    const settled = new WeakSet<Promise<void>>();
    const read = (promise: Promise<void>) => {
      if (settled.has(promise)) return;
      throw promise.then(() => {
        settled.add(promise);
      });
    };
    let renders = 0;
    const Threads = () => {
      renders++;
      const aui = useAui();
      read(aui.threads().getLoadThreadsPromise());
      const ids = useAuiState((s) => s.threads.threadIds);
      return <p>{ids.join(",")}</p>;
    };

    await mount(
      adapter,
      <Suspense fallback={<p>loading</p>}>
        <Threads />
      </Suspense>,
    );
    list.resolve({
      threads: [{ remoteId: "t1", status: "regular", title: "One" }],
    });

    expect(await screen.findByText("t1")).toBeDefined();
    expect(renders).toBeLessThan(10);
  });

  it("resolves loadMore() once the threads state reports the appended page", async () => {
    const page = deferred<ListPage>();
    const adapter = makeAdapter({
      list: vi
        .fn<RemoteThreadListAdapter["list"]>()
        .mockResolvedValueOnce({
          threads: [{ remoteId: "t1", status: "regular", title: "One" }],
          nextCursor: "c1",
        })
        .mockImplementationOnce(() => page.promise),
    });
    const aui = await mount(adapter);
    await aui.threads().getLoadThreadsPromise();

    const loaded = aui.threads().loadMore();
    page.resolve({
      threads: [{ remoteId: "t2", status: "regular", title: "Two" }],
    });
    await loaded;

    const state = aui.threads().getState();
    expect(state.threadIds).toEqual(["t1", "t2"]);
    expect(state.isLoadingMore).toBe(false);
  });

  it("holds the promise while the completing act() defers the commit", async () => {
    const list = deferred<ListPage>();
    const adapter = makeAdapter({ list: vi.fn(() => list.promise) });
    const aui = await mount(adapter);
    const loaded = aui.threads().getLoadThreadsPromise();
    let settled = false;
    void loaded.then(() => {
      settled = true;
    });

    await act(async () => {
      list.resolve({
        threads: [{ remoteId: "t1", status: "regular", title: "One" }],
      });
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(settled).toBe(false);
    });

    await loaded;
    expect(aui.threads().getState().threadIds).toEqual(["t1"]);
  });

  it("resolves inside the completing act() once the commit wait times out", async () => {
    const list = deferred<ListPage>();
    const adapter = makeAdapter({ list: vi.fn(() => list.promise) });
    const aui = await mount(adapter);

    await act(async () => {
      list.resolve({
        threads: [{ remoteId: "t1", status: "regular", title: "One" }],
      });
      await aui.threads().getLoadThreadsPromise();
    });

    expect(aui.threads().getState().threadIds).toEqual(["t1"]);
  });

  it("resolves a reload read by use() inside the boundary that hides the client", async () => {
    const actEnvironment = globalThis as {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    };
    const previous = actEnvironment.IS_REACT_ACT_ENVIRONMENT;
    // React only retries a suspended boundary from a ping outside act().
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
    try {
      const adapter = makeAdapter({
        list: vi.fn(async () => ({
          threads: [
            { remoteId: "t1", status: "regular" as const, title: "One" },
          ],
        })),
      });
      let reload!: () => void;
      const Threads = () => {
        const aui = useAui();
        const [pending, setPending] = useState<Promise<void>>();
        reload = () => setPending(aui.threads().reload());
        if (pending) use(pending);
        const ids = useAuiState((s) => s.threads.threadIds);
        return <p>ids:{ids.join(",")}</p>;
      };
      const App = () => {
        const runtime = useRemoteThreadListRuntime({
          adapter,
          runtimeHook: useThreadRuntime,
        });
        return (
          <AssistantRuntimeProvider runtime={runtime}>
            <Threads />
          </AssistantRuntimeProvider>
        );
      };
      render(
        <Suspense fallback={<p>loading</p>}>
          <App />
        </Suspense>,
      );
      expect(await screen.findByText("ids:t1")).toBeDefined();

      vi.mocked(adapter.list).mockResolvedValueOnce({
        threads: [
          { remoteId: "t1", status: "regular", title: "One" },
          { remoteId: "t2", status: "regular", title: "Two" },
        ],
      });
      reload();

      expect(await screen.findByText("ids:t1,t2")).toBeDefined();
    } finally {
      actEnvironment.IS_REACT_ACT_ENVIRONMENT = previous;
    }
  });
});

// @vitest-environment jsdom

import { createRef, Suspense, use, type ReactNode } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { resource } from "@assistant-ui/tap";
import {
  AuiConfig,
  AuiProvider,
  type AssistantClient,
  useAui,
  useAuiState,
} from "@assistant-ui/store";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deferred,
  makeAdapter,
} from "../../tests/remote-thread-list-test-helpers";
import type { RemoteThreadListAdapter } from "../../runtimes/remote-thread-list/types";
import { RemoteThreadList } from "./RemoteThreadList";

type ListPage = Awaited<ReturnType<RemoteThreadListAdapter["list"]>>;

const composer = { getState: () => ({}) };
const suggestions = { getState: () => ({ suggestions: [] }) };
const threadState = { isRunning: false, messages: [] };
const StubThread = resource(() => ({
  getState: () => threadState,
  composer: () => composer,
  suggestions: () => suggestions,
}));

afterEach(() => {
  cleanup();
});

const mount = (
  adapter: RemoteThreadListAdapter,
  children: ReactNode = null,
) => {
  const clientRef = createRef<AssistantClient>();
  render(
    <AuiProvider
      ref={clientRef as never}
      config={AuiConfig({
        threads: RemoteThreadList({
          adapter,
          thread: () => StubThread() as never,
        }),
      })}
    >
      {children}
    </AuiProvider>,
  );
  return clientRef.current!;
};

describe("RemoteThreadList list promises", () => {
  it("returns one promise per load", async () => {
    const list = deferred<ListPage>();
    const adapter = makeAdapter({ list: vi.fn(() => list.promise) });
    const aui = mount(adapter);

    const first = aui.threads.getLoadThreadsPromise();
    expect(aui.threads.getLoadThreadsPromise()).toBe(first);
    list.resolve({ threads: [] });
    await first;
    expect(aui.threads.getLoadThreadsPromise()).toBe(first);

    const reloaded = aui.threads.reload();
    expect(reloaded).not.toBe(first);
    expect(aui.threads.getLoadThreadsPromise()).toBe(reloaded);
    await reloaded;
  });

  it("suspends a use() reader of the load promise until the list is loaded", async () => {
    const list = deferred<ListPage>();
    const adapter = makeAdapter({ list: vi.fn(() => list.promise) });
    const consoleError = vi.spyOn(console, "error");
    const Threads = () => {
      const aui = useAui();
      use(aui.threads.getLoadThreadsPromise());
      const ids = useAuiState((s) => s.threads.threadIds);
      return <p>{ids.join(",")}</p>;
    };

    mount(
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
    consoleError.mockRestore();
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
      read(aui.threads.getLoadThreadsPromise());
      const ids = useAuiState((s) => s.threads.threadIds);
      return <p>{ids.join(",")}</p>;
    };

    mount(
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

  it("resolves inside act() once the loaded list is committed", async () => {
    const aui = mount(makeAdapter());
    await aui.threads.getLoadThreadsPromise();

    await act(async () => {
      await aui.threads.getLoadThreadsPromise();
    });
    expect(aui.threads.getState().isLoading).toBe(false);
  });

  it("holds the promise while the completing act() defers the commit", async () => {
    const list = deferred<ListPage>();
    const adapter = makeAdapter({ list: vi.fn(() => list.promise) });
    const aui = mount(adapter);
    const loaded = aui.threads.getLoadThreadsPromise();
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
    expect(aui.threads.getState().threadIds).toEqual(["t1"]);
  });

  it("resolves inside the completing act() once the commit wait times out", async () => {
    const list = deferred<ListPage>();
    const adapter = makeAdapter({ list: vi.fn(() => list.promise) });
    const aui = mount(adapter);

    await act(async () => {
      list.resolve({
        threads: [{ remoteId: "t1", status: "regular", title: "One" }],
      });
      await aui.threads.getLoadThreadsPromise();
    });

    expect(aui.threads.getState().threadIds).toEqual(["t1"]);
  });
});

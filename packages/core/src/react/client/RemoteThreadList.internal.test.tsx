// @vitest-environment jsdom

import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushTapSync, resource } from "@assistant-ui/tap";
import { AuiConfig, AuiProvider, useAui } from "@assistant-ui/store";
import { createAssistantClient } from "@assistant-ui/store/client";
import type { RemoteThreadListAdapter } from "../../runtimes/remote-thread-list/types";
import { LOCAL_THREAD_ID_PREFIX } from "../../runtimes/remote-thread-list/remote-thread-state";
import { RemoteThreadList } from "./RemoteThreadList";

const idCalls = vi.hoisted(() => ({ generateId: vi.fn() }));
vi.mock("../../utils/id", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/id")>();
  return {
    ...actual,
    generateId: () => {
      idCalls.generateId();
      return actual.generateId();
    },
  };
});

const threadState = { isRunning: false, messages: [] };
const composer = { getState: () => ({}) };
const suggestions = { getState: () => ({ suggestions: [] }) };
const StubThread = resource(() => ({
  getState: () => threadState,
  composer: () => composer,
  suggestions: () => suggestions,
  unstable_refetchThread: async () => {},
}));

const makeAdapter = (
  overrides: Partial<RemoteThreadListAdapter> = {},
): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({
    threads: [
      { remoteId: "t1", status: "regular" as const, title: "One" },
      { remoteId: "t2", status: "archived" as const, title: "Two" },
    ],
    cursor: "next",
  })),
  initialize: vi.fn(async (id) => ({ remoteId: `remote-${id}` })),
  fetch: vi.fn(async (id) => ({
    remoteId: id,
    status: "regular" as const,
    title: id,
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
      }),
  ),
  ...overrides,
});

const mount = (
  adapter = makeAdapter(),
  options: { backgroundThreads?: boolean; seed?: string } = {},
) => {
  const handle = createAssistantClient(
    AuiConfig({
      threads: RemoteThreadList({
        adapter,
        backgroundThreads: options.backgroundThreads,
        __internal_initialThreadIdSeed: options.seed,
        thread: () => StubThread() as never,
      }),
    }),
  );
  handle.subscribe(() => {});
  return handle;
};

afterEach(() => {
  vi.restoreAllMocks();
  idCalls.generateId.mockClear();
});

describe("RemoteThreadList internal seams", () => {
  it("uses the supplied seed for the first draft id", () => {
    const handle = mount(makeAdapter(), { seed: "fixed" });
    expect(handle.getClient().threads.getState().mainThreadId).toBe(
      `${LOCAL_THREAD_ID_PREFIX}fixed`,
    );
    handle.destroy();
  });

  it("server renders without generating a random first draft id", () => {
    const ids: string[] = [];
    const Collect = () => {
      ids.push(useAui().threads.getState().mainThreadId);
      return null;
    };
    const App = () => (
      <AuiProvider
        config={AuiConfig({
          threads: RemoteThreadList({
            adapter: makeAdapter(),
            thread: () => StubThread() as never,
          }),
        })}
      >
        <Collect />
      </AuiProvider>
    );
    const random = vi.spyOn(Math, "random");
    vi.stubGlobal("document", undefined);
    try {
      renderToString(
        <>
          <App />
          <App />
        </>,
      );
    } finally {
      vi.unstubAllGlobals();
    }
    expect(random).not.toHaveBeenCalled();
    expect(idCalls.generateId).not.toHaveBeenCalled();
    expect(ids).toHaveLength(2);
    expect(ids[0]).toMatch(new RegExp(`^${LOCAL_THREAD_ID_PREFIX}`));
    expect(ids[1]).not.toBe(ids[0]);
  });

  it("returns mounted visited bodies and leaves unknown ids undefined", async () => {
    const handle = mount(makeAdapter(), { backgroundThreads: true });
    const threads = handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const firstId = threads.getState().mainThreadId;
    const firstBody = threads.__internal_getThreadBody!(firstId);
    expect(firstBody).toBeDefined();
    await threads.__internal_getRawActions!().switchToThread("t1");
    await vi.waitFor(() => {
      expect(threads.getState().mainThreadId).toBe("t1");
      expect(threads.__internal_getThreadBody!("t1")).toBeDefined();
    });
    expect(threads.__internal_getThreadBody!(firstId)).toBe(firstBody);
    expect(threads.__internal_getThreadBody!("unknown")).toBeUndefined();
    handle.destroy();
  });

  it("returns only the main body when background threads are off", async () => {
    const handle = mount(makeAdapter(), { seed: "fixed" });
    const threads = handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const previous = threads.getState().mainThreadId;
    await threads.__internal_getRawActions!().switchToThread("t1");
    await vi.waitFor(() => {
      expect(threads.getState().mainThreadId).toBe("t1");
    });
    expect(threads.__internal_getThreadBody!("t1")).toBeDefined();
    expect(threads.__internal_getThreadBody!(previous)).toBeUndefined();
    expect(threads.__internal_getThreadBody!("unknown")).toBeUndefined();
    handle.destroy();
  });

  it.each([
    "switchToThread",
    "switchToNewThread",
    "rename",
    "archive",
    "unarchive",
    "delete",
    "detach",
    "generateTitle",
    "initialize",
    "reload",
    "reloadMainThread",
    "getLoadThreadsPromise",
    "loadMore",
  ] as const)(
    "returns the same successful outcome for raw %s",
    async (name) => {
      const handle = mount(makeAdapter(), { seed: "fixed" });
      const threads = handle.getClient().threads;
      await threads.getLoadThreadsPromise();
      const raw = threads.__internal_getRawActions!();
      let task: Promise<unknown>;
      switch (name) {
        case "switchToThread":
          task = raw.switchToThread("t1");
          break;
        case "switchToNewThread":
          task = raw.switchToNewThread();
          break;
        case "rename":
          task = raw.rename("t1", "Renamed");
          break;
        case "archive":
          task = raw.archive("t1");
          break;
        case "unarchive":
          task = raw.unarchive("t2");
          break;
        case "delete":
          task = raw.delete("t1");
          break;
        case "detach":
          task = raw.detach("t1");
          break;
        case "generateTitle":
          task = raw.generateTitle("t1", []);
          break;
        case "initialize":
          task = raw.initialize(threads.getState().mainThreadId);
          break;
        case "reload":
          task = raw.reload();
          break;
        case "reloadMainThread":
          task = raw.reloadMainThread();
          break;
        case "getLoadThreadsPromise":
          task = raw.getLoadThreadsPromise();
          break;
        case "loadMore":
          task = raw.loadMore();
          break;
      }
      const rawResult = await task;
      const wrappedHandle = mount(makeAdapter(), { seed: "fixed" });
      const wrappedThreads = wrappedHandle.getClient().threads;
      await wrappedThreads.getLoadThreadsPromise();
      const wrappedTask = flushTapSync(() => {
        switch (name) {
          case "switchToThread":
            return wrappedThreads.switchToThread("t1");
          case "switchToNewThread":
            return wrappedThreads.switchToNewThread();
          case "rename":
            return wrappedThreads.item({ id: "t1" }).rename("Renamed");
          case "archive":
            return wrappedThreads.item({ id: "t1" }).archive();
          case "unarchive":
            return wrappedThreads.item({ id: "t2" }).unarchive();
          case "delete":
            return wrappedThreads.item({ id: "t1" }).delete();
          case "detach":
            return wrappedThreads.item({ id: "t1" }).detach();
          case "generateTitle":
            return wrappedThreads.item({ id: "t1" }).generateTitle();
          case "initialize":
            return wrappedThreads.item("main").initialize();
          case "reload":
            return wrappedThreads.reload();
          case "reloadMainThread":
            return wrappedThreads.reloadMainThread();
          case "getLoadThreadsPromise":
            return wrappedThreads.getLoadThreadsPromise();
          case "loadMore":
            return wrappedThreads.loadMore();
        }
      });
      if (name === "switchToThread" || name === "switchToNewThread") {
        await vi.waitFor(() => {
          expect(wrappedThreads.getState().mainThreadId).toBe(
            threads.getState().mainThreadId,
          );
        });
      } else {
        await expect(wrappedTask as Promise<unknown>).resolves.toEqual(
          rawResult,
        );
      }
      wrappedHandle.destroy();
      handle.destroy();
    },
  );

  it("propagates a raw rejection without logging it", async () => {
    const failure = new Error("rename failed");
    const adapter = makeAdapter({
      rename: vi.fn(async () => {
        throw failure;
      }),
    });
    const handle = mount(adapter);
    const threads = handle.getClient().threads;
    await threads.getLoadThreadsPromise();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      threads.__internal_getRawActions!().rename("t1", "X"),
    ).rejects.toBe(failure);
    expect(error).not.toHaveBeenCalled();
    const wrapped = flushTapSync(() => threads.item({ id: "t1" }).rename("X"));
    await expect(wrapped as unknown as Promise<void>).rejects.toBe(failure);
    expect(error).toHaveBeenCalledWith(
      "[assistant-ui] thread list rename failed:",
      failure,
    );
    handle.destroy();
  });
});

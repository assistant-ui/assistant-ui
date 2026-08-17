import { describe, expect, it, vi } from "vitest";
import { flushTapSync, resource } from "@assistant-ui/tap";
import { AuiConfig, createAssistantClient } from "@assistant-ui/store/client";
import type { RemoteThreadListAdapter } from "../../runtimes/remote-thread-list/types";
import { RemoteThreadList } from "./RemoteThreadList";

const stubComposer = { getState: () => ({}) };
const stubSuggestions = { getState: () => ({ suggestions: [] }) };
const useStubThread = (_props: { threadId: string }) => ({
  getState: () => ({
    isRunning: false,
    messages: [],
  }),
  composer: () => stubComposer,
  suggestions: () => stubSuggestions,
  unstable_refetchThread: undefined,
});
const StubThread = resource(useStubThread);

const makeAdapter = (
  overrides: Partial<RemoteThreadListAdapter> = {},
): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({ threads: [] })),
  initialize: vi.fn(async (threadId: string) => ({
    remoteId: `remote-${threadId}`,
    externalId: undefined,
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
      }) as never,
  ),
  fetch: vi.fn(async (id: string) => ({
    status: "regular" as const,
    remoteId: id,
    externalId: undefined,
    title: id,
  })),
  ...overrides,
});

const mountList = (adapter: RemoteThreadListAdapter, threadId?: string) => {
  const onThreadIdChange = vi.fn();
  const handle = createAssistantClient(
    AuiConfig({
      threads: RemoteThreadList({
        adapter,
        thread: (id) => StubThread({ threadId: id }) as never,
        threadId,
        onThreadIdChange,
      }),
    }),
  );
  handle.subscribe(() => {});
  return { handle, onThreadIdChange };
};

describe("RemoteThreadList", () => {
  it("loads adapter threads on a standalone client", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [
          { status: "regular" as const, remoteId: "t1", title: "One" },
          { status: "archived" as const, remoteId: "t2", title: "Two" },
        ],
      })),
    });
    const { handle } = mountList(adapter);
    await handle.getClient().threads.getLoadThreadsPromise();
    await vi.waitFor(() => {
      const state = handle.getClient().threads.getState();
      expect(state.threadIds).toEqual(["t1"]);
      expect(state.archivedThreadIds).toEqual(["t2"]);
      expect(state.isLoading).toBe(false);
    });
    const state = handle.getClient().threads.getState();
    expect(adapter.list).toHaveBeenCalledOnce();
    expect(state.newThreadId).toMatch(/^__LOCALID_/);
    expect(state.mainThreadId).toBe(state.newThreadId);
    handle.destroy();
  });

  it("switches to a listed thread and back to a new thread", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();

    flushTapSync(() => aui.threads.switchToThread("t1"));
    await vi.waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe("t1");
    });

    flushTapSync(() => handle.getClient().threads.switchToNewThread());
    const afterNew = handle.getClient().threads.getState();
    expect(afterNew.mainThreadId).toBe(afterNew.newThreadId);
    expect(afterNew.threadIds).toContain("t1");
    handle.destroy();
  });

  it("initializes a new thread through the adapter", async () => {
    const adapter = makeAdapter();
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    const localId = aui.threads.getState().mainThreadId;

    const result = await aui.threads.item("main").initialize();
    expect(adapter.initialize).toHaveBeenCalledWith(localId);
    expect(result.remoteId).toBe(`remote-${localId}`);
    await vi.waitFor(() => {
      const state = handle.getClient().threads.getState();
      expect(state.threadIds).toContain(localId);
      expect(state.newThreadId).toBeNull();
      expect(handle.getClient().threads.item("main").getState().remoteId).toBe(
        `remote-${localId}`,
      );
    });
    handle.destroy();
  });

  it("fetches an unknown thread id on switch", async () => {
    const adapter = makeAdapter();
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();

    flushTapSync(() => aui.threads.switchToThread("missing"));
    await vi.waitFor(() => {
      expect(adapter.fetch).toHaveBeenCalledWith("missing");
      expect(handle.getClient().threads.getState().mainThreadId).toBe(
        "missing",
      );
      expect(handle.getClient().threads.getState().threadIds).toContain(
        "missing",
      );
    });
    handle.destroy();
  });

  it("renames and deletes through the adapter", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
    });
    const { handle } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    await vi.waitFor(() => {
      expect(handle.getClient().threads.getState().threadIds).toEqual(["t1"]);
    });

    flushTapSync(() =>
      handle.getClient().threads.item({ id: "t1" }).rename("Renamed"),
    );
    await vi.waitFor(() => {
      expect(adapter.rename).toHaveBeenCalledWith("t1", "Renamed");
      expect(
        handle.getClient().threads.item({ id: "t1" }).getState().title,
      ).toBe("Renamed");
    });

    const draftId = handle.getClient().threads.getState().mainThreadId;
    flushTapSync(() => handle.getClient().threads.item({ id: "t1" }).delete());
    await vi.waitFor(() => {
      expect(adapter.delete).toHaveBeenCalledWith("t1");
      expect(handle.getClient().threads.getState().threadIds).not.toContain(
        "t1",
      );
      expect(handle.getClient().threads.getState().mainThreadId).toBe(draftId);
    });
    handle.destroy();
  });

  it("opens a controlled threadId without echoing it back", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async () => ({
        threads: [{ status: "regular" as const, remoteId: "t1", title: "One" }],
      })),
    });
    const { handle, onThreadIdChange } = mountList(adapter, "t1");
    await handle.getClient().threads.getLoadThreadsPromise();
    await vi.waitFor(() => {
      expect(handle.getClient().threads.getState().mainThreadId).toBe("t1");
    });
    expect(onThreadIdChange).not.toHaveBeenCalled();
    handle.destroy();
  });

  it("emits onThreadIdChange after initialize settles", async () => {
    const adapter = makeAdapter();
    const { handle, onThreadIdChange } = mountList(adapter);
    const aui = handle.getClient();
    await aui.threads.getLoadThreadsPromise();
    const localId = aui.threads.getState().mainThreadId;
    await aui.threads.item("main").initialize();
    await vi.waitFor(() => {
      expect(onThreadIdChange).toHaveBeenCalledWith(`remote-${localId}`);
    });
    handle.destroy();
  });
});

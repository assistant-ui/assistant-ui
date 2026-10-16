import { flushTapSync, resource } from "@assistant-ui/tap";
import { AuiConfig, createAssistantClient } from "@assistant-ui/store/client";
import { describe, expect, it, vi } from "vitest";
import { makeAdapter } from "../../../tests/remote-thread-list-test-helpers";
import { RemoteThreadList } from "../../client/RemoteThreadList";
import { EMPTY_THREAD_CORE } from "../../../runtimes/remote-thread-list/empty-thread-core";
import { ClientThreadListRuntimeCore } from "./ClientThreadListRuntimeCore";

const waitFor = (assertion: () => void) =>
  vi.waitFor(assertion, { interval: 10 });

const stubThreadState = { isRunning: false, messages: [] };
const stubComposerState = {};
const stubSuggestionsState = { suggestions: [] };
const stubComposer = { getState: () => stubComposerState };
const stubSuggestions = { getState: () => stubSuggestionsState };

const StubThread = resource(function useStubThread() {
  return {
    getState: () => stubThreadState,
    composer: () => stubComposer,
    suggestions: () => stubSuggestions,
  };
});

const mountFacade = () => {
  const adapter = makeAdapter({
    list: vi.fn(async () => ({
      threads: [
        { status: "regular" as const, remoteId: "t1", title: "One" },
        { status: "regular" as const, remoteId: "t2", title: "Two" },
      ],
    })),
    updateCustom: vi.fn(async () => {}),
  });
  const handle = createAssistantClient(
    AuiConfig({
      threads: RemoteThreadList({
        adapter,
        thread: () => StubThread() as never,
      }),
    }),
  );
  const facade = new ClientThreadListRuntimeCore(
    "test",
    handle,
    () => ({}) as never,
    false,
  );
  handle.subscribe(() => {});
  return { adapter, handle, facade };
};

describe("ClientThreadListRuntimeCore", () => {
  it("mirrors loaded client state and notifies subscribers when it changes", async () => {
    const { handle, facade } = mountFacade();
    const notified = vi.fn();
    const unsubscribe = facade.subscribe(notified);
    const threads = handle.getClient().threads;

    await threads.getLoadThreadsPromise();
    await waitFor(() => expect(facade.threadIds).toEqual(["t1", "t2"]));
    const assertState = () => {
      const state = threads.getState();
      expect(facade.isLoading).toBe(state.isLoading);
      expect(facade.threadIds).toEqual(state.threadIds);
      expect(facade.mainThreadId).toBe(state.mainThreadId);
      expect(facade.loadError).toBe(state.loadError);
      expect(facade.switchError).toBe(state.switchError);
    };
    assertState();
    notified.mockClear();

    flushTapSync(() => void facade.switchToThread("t2"));
    await waitFor(() => expect(facade.mainThreadId).toBe("t2"));
    assertState();
    expect(notified).toHaveBeenCalled();

    unsubscribe();
    facade.__internal_dispose();
    handle.destroy();
  });

  it("switches to a listed thread and then to a new thread through the client", async () => {
    const { handle, facade } = mountFacade();
    const threads = handle.getClient().threads;
    await threads.getLoadThreadsPromise();

    flushTapSync(() => void facade.switchToThread("t2"));
    await waitFor(() => expect(threads.getState().mainThreadId).toBe("t2"));
    expect(facade.mainThreadId).toBe("t2");

    flushTapSync(() => void facade.switchToNewThread());
    await waitFor(() => expect(threads.getState().mainThreadId).not.toBe("t2"));
    expect(facade.mainThreadId).toBe(threads.getState().mainThreadId);
    expect(threads.getState().newThreadId).toBe(facade.mainThreadId);

    facade.__internal_dispose();
    handle.destroy();
  });

  it("throws for an unknown thread and returns a placeholder for a listed thread without a runtime", async () => {
    const { handle, facade } = mountFacade();
    await handle.getClient().threads.getLoadThreadsPromise();
    await waitFor(() => expect(facade.threadIds).toEqual(["t1", "t2"]));

    expect(() => facade.getThreadRuntimeCore("missing")).toThrow(
      'Thread "missing" not found while getting its runtime.',
    );
    expect(facade.getThreadRuntimeCore("t1")).toBe(EMPTY_THREAD_CORE);
    expect(facade.getMainThreadRuntimeCore()).toBe(EMPTY_THREAD_CORE);

    facade.__internal_dispose();
    handle.destroy();
  });

  it("routes item operations to the adapter with remote ids", async () => {
    const { adapter, handle, facade } = mountFacade();
    await handle.getClient().threads.getLoadThreadsPromise();

    await facade.rename("t1", "Renamed");
    expect(adapter.rename).toHaveBeenCalledExactlyOnceWith("t1", "Renamed");

    const custom = { color: "blue" };
    await facade.updateCustom("t1", custom);
    expect(adapter.updateCustom).toHaveBeenCalledExactlyOnceWith("t1", custom);

    await facade.archive("t2");
    expect(adapter.archive).toHaveBeenCalledExactlyOnceWith("t2");

    facade.__internal_dispose();
    handle.destroy();
  });
});

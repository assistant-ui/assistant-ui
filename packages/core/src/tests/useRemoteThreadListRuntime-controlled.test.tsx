// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "../react/AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "../react/runtimes/useExternalStoreRuntime";
import { useRemoteThreadListRuntime } from "../react/runtimes/useRemoteThreadListRuntime";
import type { AssistantRuntime } from "../runtime/api/assistant-runtime";
import type {
  RemoteThreadListAdapter,
  RemoteThreadMetadata,
} from "../runtimes/remote-thread-list/types";
import { deferred, makeAdapter } from "./remote-thread-list-test-helpers";

const EMPTY_MESSAGES: readonly never[] = [];

const makeThreadMetadata = (remoteId: string): RemoteThreadMetadata => ({
  status: "regular",
  remoteId,
  externalId: remoteId,
  title: "Test",
});

const useTestThreadRuntime = () =>
  useExternalStoreRuntime({
    messages: EMPTY_MESSAGES,
    isRunning: false,
    onNew: async () => {},
  });

type RuntimeRef = {
  current: AssistantRuntime | null;
};

const ControlledRuntime = ({
  adapter,
  threadId,
  onThreadIdChange,
  runtimeRef,
}: {
  adapter: RemoteThreadListAdapter;
  threadId: string | undefined;
  onThreadIdChange: (threadId: string | undefined) => void;
  runtimeRef: RuntimeRef;
}) => {
  const runtime = useRemoteThreadListRuntime({
    adapter,
    threadId,
    onThreadIdChange,
    runtimeHook: useTestThreadRuntime,
  });

  useEffect(() => {
    runtimeRef.current = runtime;
  }, [runtime, runtimeRef]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {null}
    </AssistantRuntimeProvider>
  );
};

const InlineAdapterRuntime = ({
  renderKey,
  createAdapter,
  runtimeRef,
}: {
  renderKey: number;
  createAdapter: () => RemoteThreadListAdapter;
  runtimeRef: RuntimeRef;
}) => {
  void renderKey;
  const runtime = useRemoteThreadListRuntime({
    adapter: createAdapter(),
    runtimeHook: useTestThreadRuntime,
  });

  useEffect(() => {
    runtimeRef.current = runtime;
  }, [runtime, runtimeRef]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {null}
    </AssistantRuntimeProvider>
  );
};

const waitForRemoteThread = async (
  runtimeRef: RuntimeRef,
  remoteId: string,
) => {
  await waitFor(() => {
    expect(runtimeRef.current).not.toBeNull();
    expect(runtimeRef.current!.threads.mainItem.getState().remoteId).toBe(
      remoteId,
    );
  });
};

describe("useRemoteThreadListRuntime controlled threadId", () => {
  it("treats an initial empty string as a supplied thread ID", async () => {
    const adapter = makeAdapter();
    const onThreadIdChange = vi.fn();
    const runtimeRef: RuntimeRef = { current: null };

    render(
      <ControlledRuntime
        adapter={adapter}
        threadId=""
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );

    await waitForRemoteThread(runtimeRef, "");
    expect(adapter.fetch).toHaveBeenCalledWith("");
    expect(onThreadIdChange).not.toHaveBeenCalled();
  });

  it("switches to an empty string supplied after mount", async () => {
    const adapter = makeAdapter();
    const onThreadIdChange = vi.fn();
    const runtimeRef: RuntimeRef = { current: null };

    const { rerender } = render(
      <ControlledRuntime
        adapter={adapter}
        threadId="thread-a"
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );
    await waitForRemoteThread(runtimeRef, "thread-a");

    rerender(
      <ControlledRuntime
        adapter={adapter}
        threadId=""
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );
    await waitForRemoteThread(runtimeRef, "");
    expect(adapter.fetch).toHaveBeenLastCalledWith("");
    expect(onThreadIdChange).not.toHaveBeenCalled();
  });

  it("switches controlled threads when the adapter changes in the same render", async () => {
    const adapterA = makeAdapter({ unstable_scopeKey: "a" });
    const adapterB = makeAdapter({ unstable_scopeKey: "b" });
    const onThreadIdChange = vi.fn();
    const runtimeRef: RuntimeRef = { current: null };

    const { rerender } = render(
      <ControlledRuntime
        adapter={adapterA}
        threadId="thread-a"
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );
    await waitForRemoteThread(runtimeRef, "thread-a");

    rerender(
      <ControlledRuntime
        adapter={adapterB}
        threadId="thread-b"
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );

    await waitForRemoteThread(runtimeRef, "thread-b");
    expect(adapterB.fetch).toHaveBeenCalledWith("thread-b");
    expect(onThreadIdChange).not.toHaveBeenCalled();
  });

  it("clears a controlled selection missing from the replacement adapter", async () => {
    const adapterA = makeAdapter({ unstable_scopeKey: "a" });
    const adapterB = makeAdapter({
      unstable_scopeKey: "b",
      fetch: vi.fn().mockRejectedValue(new Error("Thread not found")),
    });
    const onThreadIdChange = vi.fn();
    const runtimeRef: RuntimeRef = { current: null };

    const { rerender } = render(
      <ControlledRuntime
        adapter={adapterA}
        threadId="thread-a"
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );
    await waitForRemoteThread(runtimeRef, "thread-a");

    rerender(
      <ControlledRuntime
        adapter={adapterB}
        threadId="thread-a"
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );

    await waitFor(() => {
      expect(onThreadIdChange).toHaveBeenCalledWith(undefined);
    });
    expect(adapterB.fetch).toHaveBeenCalledWith("thread-a");
    expect(runtimeRef.current!.threads.mainItem.getState().remoteId).toBe(
      undefined,
    );
    expect(runtimeRef.current!.threads.mainItem.getState().status).toBe("new");
  });

  it("keeps a controlled selection after a transient replacement fetch failure", async () => {
    const adapterA = makeAdapter({ unstable_scopeKey: "a" });
    const adapterB = makeAdapter({
      unstable_scopeKey: "b",
      list: vi.fn().mockResolvedValue({ threads: [], nextCursor: "next" }),
      fetch: vi.fn().mockRejectedValue(new Error("Network unavailable")),
    });
    const onThreadIdChange = vi.fn();
    const runtimeRef: RuntimeRef = { current: null };

    const { rerender } = render(
      <ControlledRuntime
        adapter={adapterA}
        threadId="thread-a"
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );
    await waitForRemoteThread(runtimeRef, "thread-a");

    rerender(
      <ControlledRuntime
        adapter={adapterB}
        threadId="thread-a"
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );

    await waitFor(() => {
      expect(adapterB.fetch).toHaveBeenCalledWith("thread-a");
      expect(runtimeRef.current!.threads.getState().isLoading).toBe(false);
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(onThreadIdChange).not.toHaveBeenCalled();
    expect(runtimeRef.current!.threads.mainItem.getState().status).toBe("new");
  });

  it("selects a controlled thread found on a later replacement page", async () => {
    const adapterA = makeAdapter({ unstable_scopeKey: "a" });
    const adapterB = makeAdapter({
      unstable_scopeKey: "b",
      list: vi
        .fn()
        .mockResolvedValueOnce({ threads: [], nextCursor: "next" })
        .mockResolvedValueOnce({
          threads: [makeThreadMetadata("thread-a")],
        }),
      fetch: vi.fn().mockRejectedValue(new Error("Network unavailable")),
    });
    const onThreadIdChange = vi.fn();
    const runtimeRef: RuntimeRef = { current: null };

    const { rerender } = render(
      <ControlledRuntime
        adapter={adapterA}
        threadId="thread-a"
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );
    await waitForRemoteThread(runtimeRef, "thread-a");

    rerender(
      <ControlledRuntime
        adapter={adapterB}
        threadId="thread-a"
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );

    await waitFor(() => {
      expect(runtimeRef.current!.threads.getState().hasMore).toBe(true);
      expect(adapterB.fetch).toHaveBeenCalledWith("thread-a");
    });
    await act(() => runtimeRef.current!.threads.loadMore());

    await waitForRemoteThread(runtimeRef, "thread-a");
    expect(onThreadIdChange).not.toHaveBeenCalled();
  });

  it("clears a controlled thread missing from the final replacement page", async () => {
    const adapterA = makeAdapter({ unstable_scopeKey: "a" });
    const adapterB = makeAdapter({
      unstable_scopeKey: "b",
      list: vi
        .fn()
        .mockResolvedValueOnce({ threads: [], nextCursor: "next" })
        .mockResolvedValueOnce({ threads: [] }),
      fetch: vi.fn().mockRejectedValue(new Error("Thread not found")),
    });
    const onThreadIdChange = vi.fn();
    const runtimeRef: RuntimeRef = { current: null };

    const { rerender } = render(
      <ControlledRuntime
        adapter={adapterA}
        threadId="thread-a"
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );
    await waitForRemoteThread(runtimeRef, "thread-a");

    rerender(
      <ControlledRuntime
        adapter={adapterB}
        threadId="thread-a"
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );

    await waitFor(() => {
      expect(runtimeRef.current!.threads.getState().hasMore).toBe(true);
      expect(adapterB.fetch).toHaveBeenCalledWith("thread-a");
    });
    await act(() => runtimeRef.current!.threads.loadMore());

    await waitFor(() => {
      expect(onThreadIdChange).toHaveBeenCalledWith(undefined);
    });
  });

  it("retries a controlled selection found by the replacement list", async () => {
    const adapterA = makeAdapter({ unstable_scopeKey: "a" });
    const adapterB = makeAdapter({
      unstable_scopeKey: "b",
      list: vi.fn().mockResolvedValue({
        threads: [makeThreadMetadata("thread-a")],
      }),
      fetch: vi.fn().mockRejectedValue(new Error("Network unavailable")),
    });
    const onThreadIdChange = vi.fn();
    const runtimeRef: RuntimeRef = { current: null };

    const { rerender } = render(
      <ControlledRuntime
        adapter={adapterA}
        threadId="thread-a"
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );
    await waitForRemoteThread(runtimeRef, "thread-a");

    rerender(
      <ControlledRuntime
        adapter={adapterB}
        threadId="thread-a"
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );

    await waitForRemoteThread(runtimeRef, "thread-a");
    expect(adapterB.fetch).toHaveBeenCalledWith("thread-a");
    expect(onThreadIdChange).not.toHaveBeenCalled();
  });

  it("restarts a controlled switch when its adapter changes in flight", async () => {
    const staleFetch = deferred<RemoteThreadMetadata>();
    const replacementFetch = deferred<RemoteThreadMetadata>();
    const adapterA = makeAdapter({
      unstable_scopeKey: "a",
      fetch: vi.fn(async (threadId) => {
        if (threadId === "thread-b") return staleFetch.promise;
        return makeThreadMetadata(threadId);
      }),
    });
    const adapterB = makeAdapter({
      unstable_scopeKey: "b",
      fetch: vi.fn(() => replacementFetch.promise),
    });
    const onThreadIdChange = vi.fn();
    const runtimeRef: RuntimeRef = { current: null };

    const { rerender } = render(
      <ControlledRuntime
        adapter={adapterA}
        threadId="thread-a"
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );
    await waitForRemoteThread(runtimeRef, "thread-a");

    rerender(
      <ControlledRuntime
        adapter={adapterA}
        threadId="thread-b"
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );
    await waitFor(() => {
      expect(adapterA.fetch).toHaveBeenCalledWith("thread-b");
    });

    rerender(
      <ControlledRuntime
        adapter={adapterB}
        threadId="thread-b"
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );
    await waitFor(() => {
      expect(adapterB.fetch).toHaveBeenCalledWith("thread-b");
    });
    expect(runtimeRef.current!.threads.getState().mainThreadId).toMatch(
      /^__LOCALID_/,
    );
    expect(runtimeRef.current!.threads.mainItem.getState().status).toBe("new");

    replacementFetch.resolve(makeThreadMetadata("thread-b"));
    await waitForRemoteThread(runtimeRef, "thread-b");

    await act(async () => {
      staleFetch.resolve(makeThreadMetadata("thread-b"));
      await staleFetch.promise;
    });

    expect(adapterB.fetch).toHaveBeenCalledWith("thread-b");
    expect(runtimeRef.current!.threads.mainItem.getState().remoteId).toBe(
      "thread-b",
    );
    expect(onThreadIdChange).not.toHaveBeenCalled();
  });

  it("does not echo prop-driven thread switches", async () => {
    const adapter = makeAdapter();
    const onThreadIdChange = vi.fn();
    const runtimeRef: RuntimeRef = { current: null };

    const { rerender } = render(
      <ControlledRuntime
        adapter={adapter}
        threadId="thread-a"
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );

    await waitForRemoteThread(runtimeRef, "thread-a");
    expect(onThreadIdChange).not.toHaveBeenCalled();

    rerender(
      <ControlledRuntime
        adapter={adapter}
        threadId="thread-b"
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );

    await waitForRemoteThread(runtimeRef, "thread-b");
    expect(onThreadIdChange).not.toHaveBeenCalled();

    const previousMainThreadId =
      runtimeRef.current!.threads.getState().mainThreadId;
    rerender(
      <ControlledRuntime
        adapter={adapter}
        threadId={undefined}
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );

    await waitFor(() => {
      expect(runtimeRef.current!.threads.getState().mainThreadId).not.toBe(
        previousMainThreadId,
      );
      expect(
        runtimeRef.current!.threads.mainItem.getState().remoteId,
      ).toBeUndefined();
    });
    expect(onThreadIdChange).not.toHaveBeenCalled();
  });

  it("still emits runtime-initiated thread switches", async () => {
    const adapter = makeAdapter();
    const onThreadIdChange = vi.fn();
    const runtimeRef: RuntimeRef = { current: null };

    render(
      <ControlledRuntime
        adapter={adapter}
        threadId="thread-a"
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );

    await waitForRemoteThread(runtimeRef, "thread-a");
    onThreadIdChange.mockClear();

    await act(async () => {
      await runtimeRef.current!.threads.switchToThread("thread-b");
    });
    expect(onThreadIdChange).toHaveBeenLastCalledWith("thread-b");

    onThreadIdChange.mockClear();
    await act(async () => {
      await runtimeRef.current!.threads.switchToNewThread();
    });
    expect(onThreadIdChange).toHaveBeenLastCalledWith(undefined);
  });

  it("does not retain suppression after an initial switch fails", async () => {
    let threadAFetchCount = 0;
    const adapter = makeAdapter({
      fetch: vi.fn(async (threadId) => {
        if (threadId === "thread-a" && threadAFetchCount++ === 0) {
          throw new Error("initial fetch failed");
        }
        return makeThreadMetadata(threadId);
      }),
    });
    const onThreadIdChange = vi.fn();
    const runtimeRef: RuntimeRef = { current: null };

    render(
      <ControlledRuntime
        adapter={adapter}
        threadId="thread-a"
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );

    await waitFor(() => {
      expect(adapter.fetch).toHaveBeenCalledWith("thread-a");
      expect(runtimeRef.current).not.toBeNull();
    });

    await act(async () => {
      await runtimeRef.current!.threads.switchToThread("thread-b");
    });
    expect(onThreadIdChange).toHaveBeenLastCalledWith("thread-b");

    onThreadIdChange.mockClear();
    await act(async () => {
      await runtimeRef.current!.threads.switchToThread("thread-a");
    });
    expect(onThreadIdChange).toHaveBeenLastCalledWith("thread-a");
  });

  it("emits a concurrent runtime switch to the controlled target", async () => {
    const firstThreadBFetch = deferred<RemoteThreadMetadata>();
    let threadBFetchCount = 0;
    const adapter = makeAdapter({
      fetch: vi.fn(async (threadId) => {
        if (threadId === "thread-b" && threadBFetchCount++ === 0) {
          return firstThreadBFetch.promise;
        }
        return makeThreadMetadata(threadId);
      }),
    });
    const onThreadIdChange = vi.fn();
    const runtimeRef: RuntimeRef = { current: null };

    const { rerender } = render(
      <ControlledRuntime
        adapter={adapter}
        threadId="thread-a"
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );

    await waitForRemoteThread(runtimeRef, "thread-a");
    onThreadIdChange.mockClear();

    rerender(
      <ControlledRuntime
        adapter={adapter}
        threadId="thread-b"
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );
    await waitFor(() => {
      expect(adapter.fetch).toHaveBeenCalledWith("thread-b");
    });

    await act(async () => {
      await runtimeRef.current!.threads.switchToThread("thread-b");
    });
    expect(onThreadIdChange).toHaveBeenCalledExactlyOnceWith("thread-b");

    await act(async () => {
      firstThreadBFetch.resolve(makeThreadMetadata("thread-b"));
      await firstThreadBFetch.promise;
    });
    expect(onThreadIdChange).toHaveBeenCalledExactlyOnceWith("thread-b");
  });
});

describe("useRemoteThreadListRuntime adapter replacement", () => {
  it("reports an uncontrolled active thread being cleared", async () => {
    const adapterA = makeAdapter({ unstable_scopeKey: "a" });
    const adapterB = makeAdapter({ unstable_scopeKey: "b" });
    const onThreadIdChange = vi.fn();
    const runtimeRef: RuntimeRef = { current: null };

    const { rerender } = render(
      <ControlledRuntime
        adapter={adapterA}
        threadId={undefined}
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );
    await waitFor(() => expect(runtimeRef.current).not.toBeNull());
    await act(() => runtimeRef.current!.threads.switchToThread("thread-a"));
    expect(onThreadIdChange).toHaveBeenLastCalledWith("thread-a");

    onThreadIdChange.mockClear();
    rerender(
      <ControlledRuntime
        adapter={adapterB}
        threadId={undefined}
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );

    await waitFor(() => {
      expect(runtimeRef.current!.threads.mainItem.getState().status).toBe(
        "new",
      );
    });
    expect(onThreadIdChange).toHaveBeenCalledOnce();
    expect(onThreadIdChange).toHaveBeenCalledWith(undefined);
  });

  it("preserves the active thread when an unscoped inline adapter changes", async () => {
    const adapters: RemoteThreadListAdapter[] = [];
    const createAdapter = vi.fn(() => {
      const adapter = makeAdapter();
      adapters.push(adapter);
      return adapter;
    });
    const runtimeRef: RuntimeRef = { current: null };

    const { rerender } = render(
      <InlineAdapterRuntime
        renderKey={0}
        createAdapter={createAdapter}
        runtimeRef={runtimeRef}
      />,
    );

    await waitFor(() => {
      expect(runtimeRef.current).not.toBeNull();
      expect(runtimeRef.current!.threads.getState().mainThreadId).toBeDefined();
      expect(adapters[0]!.list).toHaveBeenCalled();
    });
    const mainThreadId = runtimeRef.current!.threads.getState().mainThreadId;

    rerender(
      <InlineAdapterRuntime
        renderKey={1}
        createAdapter={createAdapter}
        runtimeRef={runtimeRef}
      />,
    );

    await waitFor(() => {
      expect(createAdapter).toHaveBeenCalledTimes(2);
      expect(adapters[1]!.list).toHaveBeenCalled();
    });
    expect(runtimeRef.current!.threads.getState().mainThreadId).toBe(
      mainThreadId,
    );
  });
});

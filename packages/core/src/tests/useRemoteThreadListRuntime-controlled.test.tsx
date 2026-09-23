// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "../react/AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "../react/runtimes/useExternalStoreRuntime";
import { useRemoteThreadListRuntime } from "../react/runtimes/useRemoteThreadListRuntime";
import type { AssistantRuntime } from "../runtime/api/assistant-runtime";
import type { ThreadMessage } from "../types/message";
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
  useExternalStoreRuntime<ThreadMessage>({
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

  it("opens a controlled thread whose fetch failed once the list loads it", async () => {
    const list = deferred<{ threads: RemoteThreadMetadata[] }>();
    const adapter = makeAdapter({
      list: vi.fn(() => list.promise),
      fetch: vi.fn(async () => {
        throw new Error("network");
      }),
    });
    const runtimeRef: RuntimeRef = { current: null };

    render(
      <ControlledRuntime
        adapter={adapter}
        threadId="thread-a"
        onThreadIdChange={vi.fn()}
        runtimeRef={runtimeRef}
      />,
    );
    await waitFor(() => expect(adapter.fetch).toHaveBeenCalledWith("thread-a"));

    await act(async () => {
      list.resolve({ threads: [makeThreadMetadata("thread-a")] });
    });
    await waitForRemoteThread(runtimeRef, "thread-a");
  });

  it("opens a controlled thread whose fetch failed once a later page loads it", async () => {
    const adapter = makeAdapter({
      list: vi.fn(async (options?: { after?: string }) =>
        options?.after === "page-2"
          ? { threads: [makeThreadMetadata("thread-a")] }
          : { threads: [makeThreadMetadata("thread-x")], nextCursor: "page-2" },
      ),
      fetch: vi.fn(async () => {
        throw new Error("network");
      }),
    });
    const runtimeRef: RuntimeRef = { current: null };

    render(
      <ControlledRuntime
        adapter={adapter}
        threadId="thread-a"
        onThreadIdChange={vi.fn()}
        runtimeRef={runtimeRef}
      />,
    );
    await waitFor(() => expect(adapter.fetch).toHaveBeenCalledWith("thread-a"));
    await waitFor(() =>
      expect(runtimeRef.current!.threads.getState().threadIds).toEqual([
        "thread-x",
      ]),
    );

    await act(() => runtimeRef.current!.threads.loadMore());
    await waitForRemoteThread(runtimeRef, "thread-a");
  });

  it("keeps a pending controlled fetch when the list loads without its thread", async () => {
    const list = deferred<{ threads: RemoteThreadMetadata[] }>();
    const fetchA = deferred<RemoteThreadMetadata>();
    const adapter = makeAdapter({
      list: vi.fn(() => list.promise),
      fetch: vi
        .fn()
        .mockReturnValueOnce(fetchA.promise)
        .mockRejectedValue(new Error("network")),
    });
    const runtimeRef: RuntimeRef = { current: null };

    render(
      <ControlledRuntime
        adapter={adapter}
        threadId="thread-a"
        onThreadIdChange={vi.fn()}
        runtimeRef={runtimeRef}
      />,
    );
    await waitFor(() => expect(adapter.fetch).toHaveBeenCalledWith("thread-a"));

    await act(async () => {
      list.resolve({ threads: [] });
    });
    await act(async () => {
      fetchA.resolve(makeThreadMetadata("thread-a"));
    });
    await waitForRemoteThread(runtimeRef, "thread-a");
    expect(adapter.fetch).toHaveBeenCalledTimes(1);
  });

  it("reopens the controlled thread through a replacement adapter whose list fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const adapter = makeAdapter({
      list: vi.fn(async () => ({ threads: [makeThreadMetadata("thread-a")] })),
    });
    const replacement = makeAdapter({
      list: vi.fn(async () => {
        throw new Error("network");
      }),
      fetch: vi.fn(async (id: string) => makeThreadMetadata(id)),
    });
    const runtimeRef: RuntimeRef = { current: null };

    const { rerender } = render(
      <ControlledRuntime
        adapter={adapter}
        threadId="thread-a"
        onThreadIdChange={vi.fn()}
        runtimeRef={runtimeRef}
      />,
    );
    await waitForRemoteThread(runtimeRef, "thread-a");

    rerender(
      <ControlledRuntime
        adapter={replacement}
        threadId="thread-a"
        onThreadIdChange={vi.fn()}
        runtimeRef={runtimeRef}
      />,
    );
    await waitFor(() =>
      expect(replacement.fetch).toHaveBeenCalledWith("thread-a"),
    );
    await waitForRemoteThread(runtimeRef, "thread-a");
  });

  it("keeps a later switch when the list loads a controlled thread whose fetch failed", async () => {
    const list = deferred<{ threads: RemoteThreadMetadata[] }>();
    const adapter = makeAdapter({
      list: vi.fn(() => list.promise),
      fetch: vi.fn(async (id: string) => {
        if (id === "thread-a") throw new Error("network");
        return makeThreadMetadata(id);
      }),
    });
    const runtimeRef: RuntimeRef = { current: null };

    render(
      <ControlledRuntime
        adapter={adapter}
        threadId="thread-a"
        onThreadIdChange={vi.fn()}
        runtimeRef={runtimeRef}
      />,
    );
    await waitFor(() => expect(adapter.fetch).toHaveBeenCalledWith("thread-a"));
    await act(() => runtimeRef.current!.threads.switchToThread("thread-b"));
    await waitForRemoteThread(runtimeRef, "thread-b");

    await act(async () => {
      list.resolve({
        threads: [
          makeThreadMetadata("thread-a"),
          makeThreadMetadata("thread-b"),
        ],
      });
    });
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(runtimeRef.current!.threads.mainItem.getState().remoteId).toBe(
      "thread-b",
    );
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

  it("reports the reset when an adapter change makes the runtime uncontrolled", async () => {
    const adapterA = makeAdapter();
    const adapterB = makeAdapter();
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
      const state = runtimeRef.current!.threads.getState();
      expect(state.mainThreadId).toBeDefined();
      expect(runtimeRef.current!.threads.mainItem.getState().status).toBe(
        "new",
      );
    });
    expect(onThreadIdChange).not.toHaveBeenCalled();
  });

  it("does not echo a controlled target when the adapter changes", async () => {
    const adapterA = makeAdapter();
    const adapterB = makeAdapter();
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
    onThreadIdChange.mockClear();

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

  it("contains rejected callback promises on runtime-initiated switches", async () => {
    const callbackError = new Error("async host callback failed");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const adapter = makeAdapter();
    const onThreadIdChange = vi.fn(async () => {
      throw callbackError;
    });
    const runtimeRef: RuntimeRef = { current: null };

    const { unmount } = render(
      <ControlledRuntime
        adapter={adapter}
        threadId="thread-a"
        onThreadIdChange={onThreadIdChange}
        runtimeRef={runtimeRef}
      />,
    );

    try {
      await waitForRemoteThread(runtimeRef, "thread-a");

      await act(async () => {
        await expect(
          runtimeRef.current!.threads.switchToThread("thread-b"),
        ).resolves.toBeUndefined();
      });

      await waitFor(() => {
        expect(errorSpy).toHaveBeenCalledWith(
          "[assistant-ui] onThreadIdChange callback threw an error",
          callbackError,
        );
      });
      expect(onThreadIdChange).toHaveBeenCalledExactlyOnceWith("thread-b");
      expect(runtimeRef.current!.threads.mainItem.getState().remoteId).toBe(
        "thread-b",
      );
    } finally {
      unmount();
      errorSpy.mockRestore();
    }
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

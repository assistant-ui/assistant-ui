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

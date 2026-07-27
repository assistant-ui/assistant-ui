// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "../react/AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "../react/runtimes/useExternalStoreRuntime";
import { useRemoteThreadListRuntime } from "../react/runtimes/useRemoteThreadListRuntime";
import type { AssistantRuntime } from "../runtime/api/assistant-runtime";
import type { RemoteThreadListAdapter } from "../runtimes/remote-thread-list/types";
import { makeAdapter } from "./remote-thread-list-test-helpers";

const EMPTY_MESSAGES: readonly never[] = [];

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
});

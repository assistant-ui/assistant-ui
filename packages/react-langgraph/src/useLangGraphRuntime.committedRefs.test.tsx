// @vitest-environment jsdom

import { act, render, renderHook } from "@testing-library/react";
import { startTransition, Suspense, useLayoutEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type {
  AssistantRuntime,
  RemoteThreadListAdapter,
} from "@assistant-ui/core";
import { useLangGraphRuntime } from "./useLangGraphRuntime";
import { mockStreamCallbackFactory } from "./testUtils";

const emptyStream = () => vi.fn(() => mockStreamCallbackFactory([])());

const createThreadListAdapter = (): RemoteThreadListAdapter => ({
  list: vi.fn(async () => ({
    threads: [
      {
        status: "regular" as const,
        remoteId: "thread-1",
        externalId: "thread-1",
        title: "Thread",
      },
    ],
  })),
  initialize: vi.fn(async () => ({
    remoteId: "thread-1",
    externalId: "thread-1",
  })),
  rename: vi.fn(async () => {}),
  archive: vi.fn(async () => {}),
  unarchive: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  generateTitle: vi.fn(async () => new ReadableStream()),
  fetch: vi.fn(async () => ({
    status: "regular" as const,
    remoteId: "thread-1",
    externalId: "thread-1",
  })),
});

describe("useLangGraphRuntime committed refs", () => {
  it("dispatches through the committed stream after an abandoned render", async () => {
    const streamA = emptyStream();
    const streamB = emptyStream();
    const host = renderHook(() =>
      useLangGraphRuntime({ stream: emptyStream() }),
    );

    const pending = new Promise<never>(() => {});
    let blocked = false;
    const interruptedRender = vi.fn();
    const Blocker = () => {
      if (blocked) {
        interruptedRender();
        throw pending;
      }
      return null;
    };

    const capture: { runtime: AssistantRuntime | null } = { runtime: null };
    const Nested = ({ stream }: { stream: typeof streamA }) => {
      capture.runtime = useLangGraphRuntime({ stream });
      return null;
    };
    const Tree = ({ stream }: { stream: typeof streamA }) => (
      <AssistantRuntimeProvider runtime={host.result.current}>
        <Suspense fallback={null}>
          <Nested stream={stream} />
          <Blocker />
        </Suspense>
      </AssistantRuntimeProvider>
    );

    const view = render(<Tree stream={streamA} />);
    expect(capture.runtime).not.toBeNull();

    act(() => {
      blocked = true;
      startTransition(() => view.rerender(<Tree stream={streamB} />));
    });
    expect(interruptedRender).toHaveBeenCalled();

    await act(async () => {
      await capture.runtime!.thread.append("hello");
    });

    expect(streamA).toHaveBeenCalledOnce();
    expect(streamB).not.toHaveBeenCalled();

    await act(async () => {
      blocked = false;
      view.rerender(<Tree stream={streamB} />);
    });
    await act(async () => {
      await capture.runtime!.thread.append("second");
    });

    expect(streamB).toHaveBeenCalledOnce();
    view.unmount();
    host.unmount();
  });

  it("reloads through the latest committed load callback", async () => {
    const stream = emptyStream();
    const loadA = vi.fn(async () => ({ messages: [] }));
    const loadB = vi.fn(async () => ({ messages: [] }));
    const adapter = createThreadListAdapter();
    let capturedRuntime: AssistantRuntime | null = null;

    const ReloadOnCommit = ({
      runtime,
      reload,
    }: {
      runtime: AssistantRuntime;
      reload: boolean;
    }) => {
      useLayoutEffect(() => {
        if (reload) void runtime.threads.reloadMainThread();
      }, [reload, runtime]);
      return null;
    };
    const Harness = ({
      load,
      reload,
    }: {
      load: typeof loadA;
      reload: boolean;
    }) => {
      const runtime = useLangGraphRuntime({
        stream,
        load,
        unstable_threadListAdapter: adapter,
      });
      capturedRuntime = runtime;
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <ReloadOnCommit runtime={runtime} reload={reload} />
        </AssistantRuntimeProvider>
      );
    };

    const view = render(<Harness load={loadA} reload={false} />);
    await act(async () => {
      await capturedRuntime!.threads.switchToThread("thread-1");
    });
    await vi.waitFor(() => expect(loadA).toHaveBeenCalledOnce());
    loadA.mockClear();

    act(() => view.rerender(<Harness load={loadB} reload />));
    await vi.waitFor(() => expect(loadB).toHaveBeenCalledOnce());
    expect(loadA).not.toHaveBeenCalled();
    view.unmount();
  });
});

// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { startTransition, Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type { AppendMessage } from "../../types/message";
import { makeAdapter } from "../../tests/remote-thread-list-test-helpers";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";

const EMPTY_MESSAGES: readonly never[] = [];

const userMessage = (text: string): AppendMessage => ({
  parentId: null,
  sourceId: null,
  runConfig: {},
  role: "user",
  content: [{ type: "text", text }],
  attachments: [],
  metadata: { custom: {} },
  createdAt: new Date(),
  startRun: true,
});

const getThreadCore = (runtime: AssistantRuntime) =>
  (
    runtime.thread as unknown as {
      __internal_threadBinding: {
        getState(): { append(message: AppendMessage): Promise<void> };
      };
    }
  ).__internal_threadBinding.getState();

const createHarness = () => {
  const adapter = makeAdapter();
  const onNewA = vi.fn(async () => {});
  const onNewB = vi.fn(async () => {});
  const renderB = vi.fn();
  const renderThreadRuntime = vi.fn();
  const runtimeRef: { current: AssistantRuntime | null } = { current: null };
  const pending = new Promise<never>(() => {});
  let suspend = false;

  const Blocker = () => {
    if (suspend) throw pending;
    return null;
  };
  const App = ({ onNew }: { onNew: typeof onNewA }) => {
    if (onNew === onNewB) renderB();
    const useThreadRuntime = () => {
      renderThreadRuntime();
      return useExternalStoreRuntime({ messages: EMPTY_MESSAGES, onNew });
    };
    const runtime = useRemoteThreadListRuntime({
      adapter,
      runtimeHook: useThreadRuntime,
    });
    runtimeRef.current = runtime;
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Blocker />
      </AssistantRuntimeProvider>
    );
  };

  return {
    App,
    onNewA,
    onNewB,
    renderB,
    renderThreadRuntime,
    runtimeRef,
    suspend: () => {
      suspend = true;
    },
  };
};

describe("useRemoteThreadListRuntime concurrent options", () => {
  it("keeps new threads on the committed runtime hook", async () => {
    const { App, onNewA, onNewB, renderB, runtimeRef, suspend } =
      createHarness();
    const view = render(
      <Suspense fallback={null}>
        <App onNew={onNewA} />
      </Suspense>,
    );

    await act(async () => {
      await getThreadCore(runtimeRef.current!).append(userMessage("first"));
    });

    act(() => {
      suspend();
      startTransition(() =>
        view.rerender(
          <Suspense fallback={null}>
            <App onNew={onNewB} />
          </Suspense>,
        ),
      );
    });
    expect(renderB).toHaveBeenCalled();

    await act(async () => {
      await runtimeRef.current!.threads.switchToNewThread();
      await getThreadCore(runtimeRef.current!).append(userMessage("second"));
    });

    expect(onNewA).toHaveBeenCalledTimes(2);
    expect(onNewB).not.toHaveBeenCalled();
  });

  it("publishes runtime hook changes after a committed render", async () => {
    const { App, onNewA, onNewB, runtimeRef } = createHarness();
    const view = render(<App onNew={onNewA} />);

    await act(async () => {
      await getThreadCore(runtimeRef.current!).append(userMessage("first"));
    });

    view.rerender(<App onNew={onNewB} />);
    await act(async () => {
      await runtimeRef.current!.threads.switchToNewThread();
      await getThreadCore(runtimeRef.current!).append(userMessage("second"));
    });

    expect(onNewA).toHaveBeenCalledTimes(1);
    expect(onNewB).toHaveBeenCalledTimes(1);
  });

  it("does not force an extra thread runtime refresh", async () => {
    const { App, onNewA, renderThreadRuntime } = createHarness();
    const view = render(<App onNew={onNewA} />);

    await act(async () => {});
    renderThreadRuntime.mockClear();

    act(() => view.rerender(<App onNew={onNewA} />));

    expect(renderThreadRuntime).toHaveBeenCalledTimes(1);
  });
});

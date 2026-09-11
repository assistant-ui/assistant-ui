// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { startTransition, Suspense, type ReactNode } from "react";
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

const createHarness = ({ stableHook = false } = {}) => {
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
  // Every shipped adapter passes a fresh function expression, so a hoisted
  // variant is the only way to exercise an unchanged published hook.
  const useHoistedThreadRuntime = () => {
    renderThreadRuntime();
    return useExternalStoreRuntime({
      messages: EMPTY_MESSAGES,
      onNew: onNewA,
    });
  };
  const App = ({
    onNew,
    children,
  }: {
    onNew: typeof onNewA;
    children?: ReactNode;
  }) => {
    if (onNew === onNewB) renderB();
    const useThreadRuntime = stableHook
      ? useHoistedThreadRuntime
      : () => {
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
        {children ?? <Blocker />}
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
      await getThreadCore(runtimeRef.current!).append(userMessage("second"));
    });

    expect(onNewA).toHaveBeenCalledTimes(1);
    expect(onNewB).toHaveBeenCalledTimes(1);
  });

  it("costs two passes per provider commit in the documented shape", async () => {
    // Fresh children on every render, as the AssistantRuntimeProvider JSDoc
    // example does, so its memo does not block: the host renders once against
    // the previously committed hook, then the publish adds the corrective pass.
    const { App, onNewA, renderThreadRuntime } = createHarness();
    const view = render(<App onNew={onNewA} />);

    await act(async () => {});
    renderThreadRuntime.mockClear();

    await act(async () => {
      view.rerender(<App onNew={onNewA} />);
    });

    expect(renderThreadRuntime).toHaveBeenCalledTimes(2);
  });

  it("costs one pass when the provider memo blocks the host render", async () => {
    const { App, onNewA, renderThreadRuntime } = createHarness();
    const children = <div />;
    const view = render(<App onNew={onNewA}>{children}</App>);

    await act(async () => {});
    renderThreadRuntime.mockClear();

    await act(async () => {
      view.rerender(<App onNew={onNewA}>{children}</App>);
    });

    expect(renderThreadRuntime).toHaveBeenCalledTimes(1);
  });

  it("does not re-run thread runtimes when the published hook is unchanged", async () => {
    const { App, onNewA, renderThreadRuntime } = createHarness({
      stableHook: true,
    });
    const children = <div />;
    const view = render(<App onNew={onNewA}>{children}</App>);

    await act(async () => {});
    renderThreadRuntime.mockClear();

    await act(async () => {
      view.rerender(<App onNew={onNewA}>{children}</App>);
    });

    expect(renderThreadRuntime).not.toHaveBeenCalled();
  });

  it("gives a thread created after an options change the committed hook", async () => {
    const { App, onNewA, onNewB, runtimeRef } = createHarness();
    const view = render(<App onNew={onNewA} />);
    await act(async () => {});

    await act(async () => {
      view.rerender(<App onNew={onNewB} />);
    });

    await act(async () => {
      await runtimeRef.current!.threads.switchToNewThread();
      await getThreadCore(runtimeRef.current!).append(userMessage("first"));
    });

    expect(onNewB).toHaveBeenCalledTimes(1);
    expect(onNewA).not.toHaveBeenCalled();
  });
});

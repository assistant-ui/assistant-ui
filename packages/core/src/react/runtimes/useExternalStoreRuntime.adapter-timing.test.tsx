// @vitest-environment jsdom

import { useEffect, useState, type FC } from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuiEvent, useAuiState } from "@assistant-ui/store";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import type { ThreadMessageLike } from "../../runtime/utils/thread-message-like";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";

const userMessage = (id: string): ThreadMessageLike => ({
  id,
  role: "user",
  content: id,
});

const ThreadCount: FC = () => (
  <span data-testid="thread">
    {useAuiState((s) => s.thread.messages.length)}
  </span>
);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// Outside act, a host update from a timer runs through React's scheduler the
// way it does in a browser, so the commit and its passive effects can land in
// separate tasks.
const leaveAct = () => vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", false);

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("useExternalStoreRuntime adapter timing", () => {
  it("shows the host's messages in the same paint as the host's own UI", async () => {
    let append!: () => void;
    const Host: FC = () => {
      const [messages, setMessages] = useState<ThreadMessageLike[]>([]);
      append = () =>
        setMessages((current) => [
          ...current,
          userMessage(`u${current.length}`),
        ]);
      const runtime = useExternalStoreRuntime<ThreadMessageLike>({
        messages,
        convertMessage: (message) => message,
        onNew: async () => {},
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <span data-testid="host">{messages.length}</span>
          <ThreadCount />
        </AssistantRuntimeProvider>
      );
    };
    const view = render(<Host />);

    // A MutationObserver callback runs at the microtask checkpoint after the
    // task that changed the DOM, which is where a browser may paint.
    const painted: [host: string, thread: string][] = [];
    const observer = new MutationObserver(() => {
      painted.push([
        view.getByTestId("host").textContent ?? "",
        view.getByTestId("thread").textContent ?? "",
      ]);
    });
    observer.observe(view.container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    leaveAct();
    for (let i = 1; i <= 3; i++) {
      setTimeout(append, 0);
      await waitFor(() =>
        expect(view.getByTestId("thread").textContent).toBe(String(i)),
      );
    }
    observer.disconnect();

    expect(painted.length).toBeGreaterThan(0);
    expect(painted.filter(([host, thread]) => host !== thread)).toEqual([]);
  });

  const renderLoadingHost = (
    loaded: { isRunning: boolean; messages: ThreadMessageLike[] },
    Listener: FC<{ runtime: AssistantRuntime }>,
  ) => {
    let load!: () => void;
    const Host: FC = () => {
      const [state, setState] = useState({
        loading: true,
        isRunning: false,
        messages: [] as ThreadMessageLike[],
      });
      load = () => setState({ loading: false, ...loaded });
      const runtime = useExternalStoreRuntime<ThreadMessageLike>({
        messages: state.messages,
        isRunning: state.isRunning,
        convertMessage: (message) => message,
        onNew: async () => {},
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {state.loading ? null : (
            <>
              <ThreadCount />
              <Listener runtime={runtime} />
            </>
          )}
        </AssistantRuntimeProvider>
      );
    };
    const view = render(<Host />);
    return { view, load: () => load() };
  };

  it("delivers initialize to listeners mounted by the update that loads the thread", async () => {
    const storeListener = vi.fn();
    const runtimeListener = vi.fn();
    const Listener: FC<{ runtime: AssistantRuntime }> = ({ runtime }) => {
      useAuiEvent("thread.initialize", storeListener);
      useEffect(
        () => runtime.thread.unstable_on("initialize", runtimeListener),
        [runtime],
      );
      return null;
    };
    const { view, load } = renderLoadingHost(
      { isRunning: false, messages: [userMessage("u0")] },
      Listener,
    );

    leaveAct();
    setTimeout(load, 0);
    await waitFor(() =>
      expect(view.getByTestId("thread").textContent).toBe("1"),
    );
    await nextTask();

    expect(storeListener).toHaveBeenCalledOnce();
    expect(runtimeListener).toHaveBeenCalledOnce();
  });

  it("delivers runStart to listeners mounted by the update that starts the run", async () => {
    const storeListener = vi.fn();
    const runtimeListener = vi.fn();
    const Listener: FC<{ runtime: AssistantRuntime }> = ({ runtime }) => {
      useAuiEvent("thread.runStart", storeListener);
      useEffect(
        () => runtime.thread.unstable_on("runStart", runtimeListener),
        [runtime],
      );
      return null;
    };
    const { view, load } = renderLoadingHost(
      { isRunning: true, messages: [userMessage("u0")] },
      Listener,
    );

    leaveAct();
    setTimeout(load, 0);
    // The user message and the running assistant placeholder.
    await waitFor(() =>
      expect(view.getByTestId("thread").textContent).toBe("2"),
    );
    await nextTask();

    expect(storeListener).toHaveBeenCalledOnce();
    expect(runtimeListener).toHaveBeenCalledOnce();
  });
});

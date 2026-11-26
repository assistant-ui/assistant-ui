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
    try {
      for (let i = 1; i <= 3; i++) {
        setTimeout(append, 0);
        await waitFor(() =>
          expect(view.getByTestId("thread").textContent).toBe(String(i)),
        );
      }
    } finally {
      observer.disconnect();
    }

    expect(painted.length).toBeGreaterThan(0);
    expect(painted.filter(([host, thread]) => host !== thread)).toEqual([]);
  });

  type HostState = {
    mounted: boolean;
    threadId: string;
    isRunning: boolean;
    messages: ThreadMessageLike[];
  };

  // Renders a host whose `Listener` mounts in the same update that applies
  // `next`. A first, unrelated host update runs before it: the first update
  // after mount re-renders the provider synchronously, which would flush the
  // passive effects early and hide the order under test.
  const expectListenerCalledOnce = async (
    event: "initialize" | "runStart",
    next: Omit<HostState, "mounted">,
    threadCount: string,
  ) => {
    const storeListener = vi.fn();
    const runtimeListener = vi.fn();
    const Listener: FC<{ runtime: AssistantRuntime }> = ({ runtime }) => {
      useAuiEvent(`thread.${event}`, storeListener);
      useEffect(
        () => runtime.thread.unstable_on(event, runtimeListener),
        [runtime],
      );
      return null;
    };
    let setState!: (state: HostState) => void;
    const Host: FC = () => {
      const [state, set] = useState<HostState>({
        mounted: false,
        threadId: "first",
        isRunning: false,
        messages: [],
      });
      setState = set;
      const runtime = useExternalStoreRuntime<ThreadMessageLike>({
        messages: state.messages,
        isRunning: state.isRunning,
        convertMessage: (message) => message,
        onNew: async () => {},
        adapters: { threadList: { threadId: state.threadId } },
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <ThreadCount />
          {state.mounted && <Listener runtime={runtime} />}
        </AssistantRuntimeProvider>
      );
    };
    const view = render(<Host />);

    leaveAct();
    setTimeout(() =>
      setState({
        mounted: false,
        threadId: "first",
        isRunning: false,
        messages: [],
      }),
    );
    await nextTask();
    setTimeout(() => setState({ mounted: true, ...next }), 0);
    await waitFor(() =>
      expect(view.getByTestId("thread").textContent).toBe(threadCount),
    );
    await waitFor(() => {
      expect(storeListener).toHaveBeenCalled();
      expect(runtimeListener).toHaveBeenCalled();
    });
    // A duplicate delivery would land by the next task.
    await nextTask();

    expect(storeListener).toHaveBeenCalledOnce();
    expect(runtimeListener).toHaveBeenCalledOnce();
  };

  it("delivers initialize to listeners mounted by the update that loads the thread", async () => {
    await expectListenerCalledOnce(
      "initialize",
      { threadId: "first", isRunning: false, messages: [userMessage("u0")] },
      "1",
    );
  });

  it("delivers initialize to listeners mounted by the update that switches threads", async () => {
    await expectListenerCalledOnce(
      "initialize",
      { threadId: "second", isRunning: false, messages: [userMessage("u0")] },
      "1",
    );
  });

  it("delivers runStart to listeners mounted by the update that starts the run", async () => {
    // The user message and the running assistant placeholder.
    await expectListenerCalledOnce(
      "runStart",
      { threadId: "first", isRunning: true, messages: [userMessage("u0")] },
      "2",
    );
  });
});

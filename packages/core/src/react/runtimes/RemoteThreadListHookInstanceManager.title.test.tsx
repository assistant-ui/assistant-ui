// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSyncExternalStore } from "react";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import { useLocalRuntime } from "./useLocalRuntime";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type { AppendMessage } from "../../types/message";
import type { ThreadMessageLike } from "../../runtime/utils/thread-message-like";
import type { RemoteThreadListAdapter } from "../../runtimes/remote-thread-list/types";
import {
  deferred,
  makeAdapter,
} from "../../tests/remote-thread-list-test-helpers";

const userMessage = (text: string): AppendMessage => ({
  parentId: null,
  sourceId: null,
  runConfig: {},
  role: "user",
  content: [{ type: "text", text }],
  attachments: [],
  metadata: { custom: {} },
  createdAt: new Date(),
  startRun: false,
});

const getThreadCore = (runtime: AssistantRuntime) =>
  (
    runtime.thread as unknown as {
      __internal_threadBinding: {
        getState(): { append(message: AppendMessage): Promise<void> };
      };
    }
  ).__internal_threadBinding.getState();

describe("RemoteThreadListHookInstanceManager title generation", () => {
  it("waits for the settled exchange after initialization resolves", async () => {
    const initialization = deferred<{
      remoteId: string;
      externalId: string;
    }>();
    const run = deferred<{ content: { type: "text"; text: string }[] }>();
    const generateTitle = vi.fn<RemoteThreadListAdapter["generateTitle"]>(
      async () => new ReadableStream(),
    );
    const adapter = makeAdapter({
      initialize: vi.fn(() => initialization.promise),
      generateTitle,
    });
    const runtimeRef: { current: AssistantRuntime | null } = { current: null };

    const App = () => {
      const runtime = useRemoteThreadListRuntime({
        adapter,
        runtimeHook: () => useLocalRuntime({ run: () => run.promise }),
      });
      runtimeRef.current = runtime;
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);
    await waitFor(() => {
      expect(runtimeRef.current?.threads.mainItem.getState().id).toBeDefined();
    });
    const localId = runtimeRef.current!.threads.mainItem.getState().id;

    void getThreadCore(runtimeRef.current!).append({
      ...userMessage("hello"),
      startRun: true,
    });
    await act(async () => {});

    expect(adapter.initialize).toHaveBeenCalledTimes(1);
    expect(generateTitle).not.toHaveBeenCalled();

    initialization.resolve({
      remoteId: `remote-${localId}`,
      externalId: `external-${localId}`,
    });

    await waitFor(() => expect(generateTitle).not.toHaveBeenCalled());
    await act(async () => {
      run.resolve({ content: [{ type: "text", text: "hi" }] });
    });
    await waitFor(() => expect(generateTitle).toHaveBeenCalledTimes(1));
    expect(generateTitle).toHaveBeenCalledWith(`remote-${localId}`, [
      expect.objectContaining({
        role: "user",
        content: [expect.objectContaining({ type: "text", text: "hello" })],
      }),
      expect.objectContaining({ role: "assistant" }),
    ]);
  });

  it("excludes the in-flight assistant message from the title payload", async () => {
    const initialization = deferred<{
      remoteId: string;
      externalId: string;
    }>();
    const run = deferred<{ content: { type: "text"; text: string }[] }>();
    const generateTitle = vi.fn<RemoteThreadListAdapter["generateTitle"]>(
      async () => new ReadableStream(),
    );
    const adapter = makeAdapter({
      initialize: vi.fn(() => initialization.promise),
      generateTitle,
    });
    const runtimeRef: { current: AssistantRuntime | null } = { current: null };

    const App = () => {
      const runtime = useRemoteThreadListRuntime({
        adapter,
        runtimeHook: () => useLocalRuntime({ run: () => run.promise }),
      });
      runtimeRef.current = runtime;
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);
    await waitFor(() => {
      expect(runtimeRef.current?.threads.mainItem.getState().id).toBeDefined();
    });
    const localId = runtimeRef.current!.threads.mainItem.getState().id;

    void getThreadCore(runtimeRef.current!).append({
      ...userMessage("hello"),
      startRun: true,
    });
    await act(async () => {});

    initialization.resolve({
      remoteId: `remote-${localId}`,
      externalId: `external-${localId}`,
    });

    await waitFor(() => {
      expect(generateTitle).not.toHaveBeenCalled();
    });
    await act(async () => {
      run.resolve({ content: [{ type: "text", text: "hi there" }] });
    });
    await waitFor(() => expect(generateTitle).toHaveBeenCalledTimes(1));
    const titleCall = generateTitle.mock.calls[0];
    if (titleCall === undefined) throw new Error("Expected title generation");
    const [, titledMessages] = titleCall;
    expect(titledMessages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
    ]);
  });

  it("does not title an assistant-only first turn", async () => {
    const initialization = deferred<{
      remoteId: string;
      externalId: string;
    }>();
    const run = deferred<{ content: { type: "text"; text: string }[] }>();
    const generateTitle = vi.fn<RemoteThreadListAdapter["generateTitle"]>(
      async () => new ReadableStream(),
    );
    const adapter = makeAdapter({
      initialize: vi.fn(() => initialization.promise),
      generateTitle,
    });
    const runtimeRef: { current: AssistantRuntime | null } = { current: null };

    const App = () => {
      const runtime = useRemoteThreadListRuntime({
        adapter,
        runtimeHook: () => useLocalRuntime({ run: () => run.promise }),
      });
      runtimeRef.current = runtime;
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);
    await waitFor(() => {
      expect(runtimeRef.current?.threads.mainItem.getState().id).toBeDefined();
    });
    const localId = runtimeRef.current!.threads.mainItem.getState().id;

    act(() => {
      runtimeRef.current!.thread.startRun({ parentId: null });
    });
    await act(async () => {});

    initialization.resolve({
      remoteId: `remote-${localId}`,
      externalId: `external-${localId}`,
    });
    await act(async () => {});

    expect(generateTitle).not.toHaveBeenCalled();

    run.resolve({ content: [{ type: "text", text: "hi there" }] });

    await Promise.resolve();
    expect(generateTitle).not.toHaveBeenCalled();
  });

  it("waits for the settled exchange when initialization resolves before the store lands it", async () => {
    const generateTitle = vi.fn<RemoteThreadListAdapter["generateTitle"]>(
      async () => new ReadableStream(),
    );
    const adapter = makeAdapter({ generateTitle });
    const store = {
      messages: [] as readonly ThreadMessageLike[],
      listeners: new Set<() => void>(),
      subscribe(callback: () => void) {
        store.listeners.add(callback);
        return () => store.listeners.delete(callback);
      },
      set(messages: readonly ThreadMessageLike[]) {
        store.messages = messages;
        for (const listener of store.listeners) listener();
      },
    };
    const capture: { runtime: AssistantRuntime | null } = { runtime: null };

    const App = () => {
      const runtime = useRemoteThreadListRuntime({
        adapter,
        runtimeHook: () => {
          const messages = useSyncExternalStore(
            store.subscribe,
            () => store.messages,
          );
          return useExternalStoreRuntime({
            messages,
            convertMessage: (message: ThreadMessageLike) => message,
            onNew: async () => {},
          });
        },
      });
      capture.runtime = runtime;
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };

    render(<App />);
    await waitFor(() => {
      expect(capture.runtime?.threads.mainItem.getState().id).toBeDefined();
    });

    void getThreadCore(capture.runtime!).append(userMessage("hello"));
    await waitFor(() => {
      expect(adapter.initialize).toHaveBeenCalledTimes(1);
    });

    await act(async () => {});
    expect(generateTitle).not.toHaveBeenCalled();

    await act(async () => {
      store.set([{ role: "user", content: [{ type: "text", text: "hello" }] }]);
    });
    expect(generateTitle).not.toHaveBeenCalled();

    await act(async () => {
      store.set([
        { role: "user", content: [{ type: "text", text: "hello" }] },
        {
          role: "assistant",
          status: { type: "complete", reason: "stop" },
          content: [{ type: "text", text: "hi" }],
        },
      ]);
    });

    await waitFor(() => {
      expect(generateTitle).toHaveBeenCalledTimes(1);
    });
    const titleCall = generateTitle.mock.calls[0];
    if (titleCall === undefined) throw new Error("Expected title generation");
    const [, titledMessages] = titleCall;
    expect(titledMessages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
    ]);
  });
});

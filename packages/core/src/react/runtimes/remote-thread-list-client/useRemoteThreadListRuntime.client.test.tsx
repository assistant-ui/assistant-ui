// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { ChatModelAdapter } from "../../../index";
import type { AssistantRuntime } from "../../../runtime/api/assistant-runtime";
import { InMemoryThreadListAdapter } from "../../../runtimes/remote-thread-list/adapter/in-memory";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import { useLocalRuntime } from "../useLocalRuntime";
import { useRemoteThreadListRuntime } from "../useRemoteThreadListRuntime";

const { legacyConstructed } = vi.hoisted(() => ({
  legacyConstructed: vi.fn(),
}));

vi.mock("../RemoteThreadListThreadListRuntimeCore", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("../RemoteThreadListThreadListRuntimeCore")
    >();
  return {
    ...original,
    RemoteThreadListThreadListRuntimeCore: class
      extends original.RemoteThreadListThreadListRuntimeCore
    {
      constructor(
        ...args: ConstructorParameters<
          typeof original.RemoteThreadListThreadListRuntimeCore
        >
      ) {
        super(...args);
        legacyConstructed();
      }
    },
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  legacyConstructed.mockClear();
});

describe("useRemoteThreadListRuntime client bridge", () => {
  it("lists threads, initializes a sent draft, and keeps the main runtime bound across switches", async () => {
    const adapter = new InMemoryThreadListAdapter();
    const initialize = vi.spyOn(adapter, "initialize");
    const model = {
      run: vi.fn(async (_args: Parameters<ChatModelAdapter["run"]>[0]) => ({
        content: [],
      })),
    };
    let runtime: AssistantRuntime | undefined;
    const App = () => {
      runtime = useRemoteThreadListRuntime({
        adapter,
        runtimeHook: () => useLocalRuntime(model),
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };
    render(<App />);
    await waitFor(() =>
      expect(runtime!.threads.getState().isLoading).toBe(false),
    );
    expect(legacyConstructed).not.toHaveBeenCalled();
    expect(runtime!.threads.getState().threadIds).toEqual([]);
    expect(runtime!.thread).toBe(runtime!.threads.main);
    const firstId = runtime!.threads.getState().mainThreadId;

    await act(async () => {
      runtime!.thread.composer.setText("first");
      runtime!.thread.composer.send();
    });
    await waitFor(() => expect(initialize).toHaveBeenCalledWith(firstId));
    await waitFor(() =>
      expect(runtime!.threads.getState().threadIds).toContain(firstId),
    );

    await act(async () => runtime!.threads.switchToNewThread());
    const nextId = runtime!.threads.getState().mainThreadId;
    expect(nextId).not.toBe(firstId);
    await act(async () => {
      runtime!.thread.composer.setText("hello");
      runtime!.thread.composer.send();
    });
    await waitFor(() => expect(initialize).toHaveBeenCalledWith(nextId));
    await waitFor(() =>
      expect(runtime!.threads.getState().threadIds).toContain(nextId),
    );
    await waitFor(() => expect(model.run).toHaveBeenCalled());
    expect(model.run.mock.calls[0]?.[0].unstable_threadId).toBeDefined();

    await act(async () => runtime!.threads.switchToThread(firstId));
    await waitFor(() =>
      expect(runtime!.threads.getState().mainThreadId).toBe(firstId),
    );
    expect(runtime!.thread.getState().threadId).toBe(firstId);
    expect(runtime!.thread).toBe(runtime!.threads.main);
  });

  it("uses the frozen class path when unstable_Provider is present", async () => {
    const adapter = Object.assign(new InMemoryThreadListAdapter(), {
      unstable_Provider: ({ children }: { children?: ReactNode }) => children,
    });
    const model = { run: vi.fn(async () => ({ content: [] })) };
    const App = () => {
      const runtime = useRemoteThreadListRuntime({
        adapter,
        runtimeHook: () => useLocalRuntime(model),
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };
    render(<App />);
    await waitFor(() => expect(legacyConstructed).toHaveBeenCalledTimes(1));
  });
});

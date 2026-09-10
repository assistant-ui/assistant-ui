// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import {
  AuiConfig,
  AuiProvider,
  type AssistantClient,
} from "@assistant-ui/store";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ModelContextProvider } from "../../model-context/types";
import type { ThreadMessage } from "../../types/message";
import type { ThreadListItemState } from "../../runtime/api/bindings";
import {
  ThreadRuntimeImpl,
  type ThreadListItemRuntimeBinding,
  type ThreadRuntimeCoreBinding,
} from "../../runtime/api/thread-runtime";
import { ExternalStoreThreadRuntimeCore } from "../../runtimes/external-store/external-store-thread-runtime-core";
import { ThreadClient } from "./thread-runtime-client";

const path = {
  ref: "threads.main",
  threadSelector: { type: "main" as const },
};

const threadListItem: ThreadListItemState = {
  id: "thread-1",
  remoteId: undefined,
  externalId: undefined,
  isMain: true,
  isRunning: false,
  status: "regular",
  title: undefined,
};

const message = {
  id: "removed",
  role: "user",
  content: [{ type: "text", text: "Hello" }],
  createdAt: new Date(0),
  attachments: [],
  metadata: { custom: {} },
} as ThreadMessage;

const contextProvider: ModelContextProvider = {
  getModelContext: () => ({}),
};

const createRuntime = (core: ExternalStoreThreadRuntimeCore) => {
  const threadBinding: ThreadRuntimeCoreBinding = {
    path,
    getState: () => core,
    subscribe: (callback) => core.subscribe(callback),
    outerSubscribe: (callback) => core.subscribe(callback),
  };
  const threadListItemBinding: ThreadListItemRuntimeBinding = {
    path,
    getState: () => threadListItem,
    subscribe: () => () => {},
  };
  return new ThreadRuntimeImpl(threadBinding, threadListItemBinding);
};

const renderClient = (runtime: ThreadRuntimeImpl) => {
  const captured: { current: AssistantClient | null } = { current: null };
  const App = () => {
    const config = AuiConfig({ thread: ThreadClient({ runtime }) });
    return (
      <AuiProvider
        config={config}
        ref={(value: AssistantClient | null) => {
          captured.current = value;
        }}
      >
        {null}
      </AuiProvider>
    );
  };

  act(() => {
    render(<App />);
  });
  if (!captured.current)
    throw new Error("Expected the assistant client to mount.");
  return captured.current;
};

describe("ThreadClient", () => {
  afterEach(() => {
    act(() => vi.runOnlyPendingTimers());
    cleanup();
    vi.useRealTimers();
  });

  it("keeps the optimistic head visible until cancellation drops it", () => {
    vi.useFakeTimers();
    const core = new ExternalStoreThreadRuntimeCore(contextProvider, {
      messages: [message],
      isRunning: true,
      onNew: vi.fn(),
      onCancel: vi.fn(),
    });
    const runtime = createRuntime(core);
    const optimisticId = core.messages.at(-1)!.id;
    expect(optimisticId).not.toBe(message.id);
    const client = renderClient(runtime);
    expect(client.thread.getState().messages.map(({ id }) => id)).toEqual([
      message.id,
      optimisticId,
    ]);

    act(() => runtime.cancelRun());

    expect(core.messages.map(({ id }) => id)).toEqual([message.id]);
    expect(runtime.getState().messages.map(({ id }) => id)).toEqual([
      message.id,
    ]);
    expect(client.thread.getState().messages.map(({ id }) => id)).toEqual([
      message.id,
    ]);
  });

  it("keeps cancellation removal coherent through deferred reconciliation", () => {
    vi.useFakeTimers();
    const onCancel = vi.fn();
    const setMessages = vi.fn();
    const core = new ExternalStoreThreadRuntimeCore(contextProvider, {
      messages: [message],
      isRunning: true,
      onNew: vi.fn(),
      onCancel,
      setMessages,
    });

    const runtime = createRuntime(core);
    const client = renderClient(runtime);
    expect(client.thread.getState().messages.map(({ id }) => id)).toContain(
      message.id,
    );

    act(() => runtime.cancelRun());

    expect(runtime.getState().messages).toEqual([]);
    expect(core.messages).toEqual([]);

    act(() => {
      core.__internal_setAdapter({
        messages: [message],
        isRunning: true,
        onNew: vi.fn(),
        onCancel,
        setMessages,
      });
    });
    expect(runtime.getState().messages.map(({ id }) => id)).toContain(
      message.id,
    );
    expect(client.thread.getState().messages.map(({ id }) => id)).toContain(
      message.id,
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(runtime.getState().messages).toEqual([]);
    expect(core.messages).toEqual([]);
    expect(client.thread.getState().messages).toEqual([]);
  });
});

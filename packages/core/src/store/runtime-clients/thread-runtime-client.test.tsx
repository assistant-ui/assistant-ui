// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import {
  AuiConfig,
  AuiProvider,
  type AssistantClient,
} from "@assistant-ui/store";
import { describe, expect, it, vi } from "vitest";
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

describe("ThreadClient", () => {
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
    const runtime = new ThreadRuntimeImpl(threadBinding, threadListItemBinding);

    const App = () => {
      const config = AuiConfig({ thread: ThreadClient({ runtime }) });
      return (
        <AuiProvider
          config={config}
          ref={(value: AssistantClient | null) => {
            client = value;
          }}
        >
          {null}
        </AuiProvider>
      );
    };

    const unsubscribe = runtime.subscribe(() => {});
    expect(runtime.getState().messages.map(({ id }) => id)).toContain(
      message.id,
    );

    runtime.cancelRun();

    expect(runtime.getState().messages).toEqual([]);
    expect(core.messages).toEqual([]);

    core.__internal_setAdapter({
      messages: [message],
      isRunning: true,
      onNew: vi.fn(),
      onCancel,
      setMessages,
    });
    expect(runtime.getState().messages.map(({ id }) => id)).toContain(
      message.id,
    );
    vi.runAllTimers();

    let client: AssistantClient | null = null;
    act(() => {
      render(<App />);
    });

    expect(runtime.getState().messages).toEqual([]);
    expect(core.messages).toEqual([]);
    expect(client!.thread.getState().messages).toEqual([]);
    unsubscribe();
    vi.runAllTimers();
    vi.useRealTimers();
  });
});

// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import {
  AuiConfig,
  AuiProvider,
  type AssistantClient,
} from "@assistant-ui/store";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ThreadListItemState } from "../../runtime/api/bindings";
import { ThreadRuntimeImpl } from "../../runtime/api/thread-runtime";
import type { ExternalStoreAdapter } from "../../runtimes/external-store/external-store-adapter";
import { ExternalStoreThreadRuntimeCore } from "../../runtimes/external-store/external-store-thread-runtime-core";
import type { ThreadMessage } from "../../types/message";
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
};

const userMessage = {
  id: "u1",
  role: "user",
  content: [{ type: "text", text: "Hello" }],
  createdAt: new Date(0),
  attachments: [],
  metadata: { custom: {} },
} as ThreadMessage;

const renderThreadClient = (
  core: ExternalStoreThreadRuntimeCore,
  configureRuntime?: (runtime: ThreadRuntimeImpl) => void,
) => {
  const runtime = new ThreadRuntimeImpl(
    {
      path,
      getState: () => core,
      subscribe: (callback) => core.subscribe(callback),
      outerSubscribe: (callback) => core.subscribe(callback),
    },
    {
      path,
      getState: () => threadListItem,
      subscribe: () => () => {},
    },
  );
  configureRuntime?.(runtime);
  const captured: { current: AssistantClient | null } = { current: null };
  const App = () => (
    <AuiProvider
      config={AuiConfig({ thread: ThreadClient({ runtime }) })}
      ref={(client: AssistantClient | null) => {
        captured.current = client;
      }}
    >
      {null}
    </AuiProvider>
  );
  let unmount!: () => void;
  act(() => {
    ({ unmount } = render(<App />));
  });
  if (!captured.current) throw new Error("Expected the client to mount.");
  return { runtime, client: captured.current, unmount };
};

describe("ThreadClient", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a run cancelled before its placeholder reached the client", async () => {
    const adapter = (
      overrides: Partial<ExternalStoreAdapter<ThreadMessage>>,
    ): ExternalStoreAdapter<ThreadMessage> => ({
      messages: [],
      onNew: vi.fn(),
      onCancel: vi.fn(),
      ...overrides,
    });
    const core = new ExternalStoreThreadRuntimeCore(
      { getModelContext: () => ({}) },
      adapter({}),
    );
    const { runtime, client } = renderThreadClient(core);

    act(() => {
      core.__internal_setAdapter(
        adapter({ messages: [userMessage], isRunning: true }),
      );
      expect(core.messages).toHaveLength(2);
      runtime.cancelRun();
    });

    expect(client.thread.getState().messages.map(({ id }) => id)).toEqual([
      "u1",
    ]);

    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));

    expect(client.thread.getState().messages.map(({ id }) => id)).toEqual([
      "u1",
    ]);
  });

  it("attempts every event cleanup when one unsubscribe throws", () => {
    const core = new ExternalStoreThreadRuntimeCore(
      { getModelContext: () => ({}) },
      {
        messages: [],
        onNew: vi.fn(),
        onCancel: vi.fn(),
      },
    );
    const cleanupError = new Error("cleanup failed");
    const cleanupOrder: number[] = [];
    let subscriptionCount = 0;
    const { unmount } = renderThreadClient(core, (runtime) => {
      vi.spyOn(runtime, "unstable_on").mockImplementation((() => {
        const index = subscriptionCount++;
        return () => {
          cleanupOrder.push(index);
          if (index === 0) throw cleanupError;
        };
      }) as never);
    });

    expect(() => unmount()).toThrow(cleanupError);
    expect(cleanupOrder).toEqual([0, 1, 2, 3, 4]);
  });
});

// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { AuiConfig, AuiProvider } from "@assistant-ui/store";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ModelContextProvider } from "../../../model-context/types";
import type { ThreadMessage } from "../../../types/message";
import type { ThreadListItemState } from "../../../runtime/api/bindings";
import {
  ThreadRuntimeImpl,
  type ThreadListItemRuntimeBinding,
  type ThreadRuntimeCoreBinding,
} from "../../../runtime/api/thread-runtime";
import { ExternalStoreThreadRuntimeCore } from "../../../runtimes/external-store/external-store-thread-runtime-core";
import type { ExternalStoreAdapter } from "../../../runtimes/external-store/external-store-adapter";
import { ThreadClient } from "../../../store/runtime-clients/thread-runtime-client";
import type { MessageState } from "../../../store";
import { ThreadPrimitiveMessages } from "./ThreadMessages";

const contextProvider: ModelContextProvider = {
  getModelContext: () => ({}),
};

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

const message = (id: string, role: "user" | "assistant", optimistic = false) =>
  ({
    id,
    createdAt: new Date(0),
    role,
    content: [{ type: "text", text: id }],
    attachments: [],
    metadata: {
      custom: {},
      ...(optimistic ? { isOptimistic: true } : undefined),
    },
    ...(role === "assistant"
      ? { status: optimistic ? { type: "running" } : { type: "complete" } }
      : undefined),
  }) as ThreadMessage;

const adapter = (
  messages: readonly ThreadMessage[],
  isRunning = false,
): ExternalStoreAdapter => ({
  messages,
  isRunning,
  onNew: vi.fn(),
});

const StatefulMessage = ({ message }: { message: MessageState }) => {
  const [initialId] = useState(message.id);
  return <span>{`${initialId}:${message.id}`}</span>;
};

const renderMessages = (core: ExternalStoreThreadRuntimeCore) => {
  const runtime = createRuntime(core);
  const App = () => {
    const config = AuiConfig({ thread: ThreadClient({ runtime }) });
    return (
      <AuiProvider config={config}>
        <ThreadPrimitiveMessages>
          {({ message }) => <StatefulMessage message={message} />}
        </ThreadPrimitiveMessages>
      </AuiProvider>
    );
  };
  return render(<App />);
};

describe("ThreadPrimitiveMessages", () => {
  afterEach(cleanup);

  it("keeps component state with the surviving message after removal", () => {
    const first = message("first", "user");
    const second = message("second", "assistant");
    const core = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([first, second]),
    );
    renderMessages(core);

    act(() => core.__internal_setAdapter(adapter([second])));

    expect(screen.queryByText("second:second")).not.toBeNull();
    expect(screen.queryByText("first:second")).toBeNull();
  });

  it("does not remount when a streaming message receives its server id", () => {
    const user = message("user", "user");
    const optimistic = message("client_id", "assistant", true);
    const core = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([user, optimistic], true),
    );
    renderMessages(core);

    const server = message("server_id", "assistant", true);
    act(() => core.__internal_setAdapter(adapter([user, server], true)));

    expect(screen.queryByText("client_id:server_id")).not.toBeNull();
    expect(screen.queryByText("server_id:server_id")).toBeNull();
  });
});

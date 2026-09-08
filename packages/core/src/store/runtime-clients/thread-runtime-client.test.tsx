// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { AuiConfig, AuiProvider } from "@assistant-ui/store";
import { describe, expect, it } from "vitest";
import type { ThreadMessage } from "../../types/message";
import type { ThreadListItemState } from "../../runtime/api/bindings";
import {
  ThreadRuntimeImpl,
  type ThreadListItemRuntimeBinding,
  type ThreadRuntimeCoreBinding,
} from "../../runtime/api/thread-runtime";
import { ReadonlyThreadRuntimeCore } from "../../runtimes/readonly/ReadonlyThreadRuntimeCore";
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

describe("ThreadClient", () => {
  it("does not render a message removed from the live core", async () => {
    const core = new ReadonlyThreadRuntimeCore();
    core.setMessages([message]);

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

    const unsubscribe = runtime.subscribe(() => {});
    expect(runtime.getState().messages).toEqual([message]);

    (core as unknown as { _messages: readonly ThreadMessage[] })._messages = [];
    expect(runtime.getState().messages).toEqual([message]);
    expect(runtime.__internal_threadBinding.getState().messages).toEqual([]);
    expect(() => runtime.getMessageById(message.id)).toThrow(
      "Entry not available in the store",
    );

    const App = () => {
      const config = AuiConfig({ thread: ThreadClient({ runtime }) });
      return <AuiProvider config={config}>{null}</AuiProvider>;
    };

    await act(async () => {
      render(<App />);
    });
    unsubscribe();
  });
});

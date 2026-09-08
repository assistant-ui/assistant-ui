// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import {
  AuiConfig,
  AuiProvider,
  type AssistantClient,
} from "@assistant-ui/store";
import { flushSync } from "react-dom";
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
  it("filters a removed message during an earlier subscriber's synchronous rerender", async () => {
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

    let client: AssistantClient | null = null;
    const App = ({ revision }: { revision: number }) => {
      const config = AuiConfig({ thread: ThreadClient({ runtime }) });
      return (
        <AuiProvider
          key={revision}
          config={config}
          ref={(value) => {
            client = value;
          }}
        >
          {null}
        </AuiProvider>
      );
    };

    let revision = 0;
    let rerender: ReturnType<typeof render>["rerender"] | undefined;
    const unsubscribe = core.subscribe(() => {
      if (!rerender) return;
      flushSync(() => rerender!(<App revision={++revision} />));
    });

    await act(async () => {
      rerender = render(<App revision={revision} />).rerender;
    });

    expect(runtime.getState().messages).toEqual([message]);

    await act(async () => {
      core.setMessages([]);
    });

    expect(client!.thread.getState().messages).toEqual([]);
    unsubscribe();
  });
});

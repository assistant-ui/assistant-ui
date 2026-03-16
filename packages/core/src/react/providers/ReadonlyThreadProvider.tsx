import {
  type FC,
  type PropsWithChildren,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAui, AuiProvider, Derived } from "@assistant-ui/store";
import type { ThreadMessage } from "../../types/message";
import { ReadonlyThreadRuntimeCore } from "../../runtimes/readonly/ReadonlyThreadRuntimeCore";
import {
  ThreadRuntimeImpl,
  type ThreadRuntimeCoreBinding,
  type ThreadListItemRuntimeBinding,
} from "../../runtime/internal";
import { ThreadClient } from "../../store/runtime-clients/thread-runtime-client";
import type { ThreadListItemState } from "../../runtime/api/bindings";

const READONLY_THREAD_PATH = Object.freeze({
  ref: "readonly-thread",
  threadSelector: { type: "main" as const },
});

const READONLY_THREAD_LIST_ITEM: ThreadListItemState = Object.freeze({
  id: "readonly",
  remoteId: undefined,
  externalId: undefined,
  isMain: true,
  status: "regular" as const,
  title: undefined,
});

const READONLY_THREAD_LIST_ITEM_BINDING: ThreadListItemRuntimeBinding =
  Object.freeze({
    path: READONLY_THREAD_PATH,
    getState: () => READONLY_THREAD_LIST_ITEM,
    subscribe: () => () => {},
  });

export namespace ReadonlyThreadProvider {
  export type Props = PropsWithChildren<{
    messages: readonly ThreadMessage[];
  }>;
}

export const ReadonlyThreadProvider: FC<ReadonlyThreadProvider.Props> = ({
  messages,
  children,
}) => {
  const [core] = useState(() => {
    const c = new ReadonlyThreadRuntimeCore();
    c.setMessages(messages);
    return c;
  });

  useEffect(() => {
    core.setMessages(messages);
  }, [core, messages]);

  const threadRuntime = useMemo(() => {
    const threadBinding: ThreadRuntimeCoreBinding = {
      path: READONLY_THREAD_PATH,
      getState: () => core,
      subscribe: (callback) => core.subscribe(callback),
      outerSubscribe: (callback) => core.subscribe(callback),
    };

    return new ThreadRuntimeImpl(
      threadBinding,
      READONLY_THREAD_LIST_ITEM_BINDING,
    );
  }, [core]);

  const aui = useAui({
    thread: ThreadClient({ runtime: threadRuntime }),
    composer: Derived({
      source: "thread",
      query: {},
      get: (aui) => aui.thread().composer(),
    }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};

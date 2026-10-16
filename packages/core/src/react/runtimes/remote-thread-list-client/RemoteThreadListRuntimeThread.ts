import { useEffect, useInsertionEffect, useMemo, useRef } from "react";
import { resource, useResource } from "@assistant-ui/tap";
import { useAui } from "@assistant-ui/store";
import {
  createClientFacade,
  useAssistantContextProvider,
} from "@assistant-ui/store/client";
import { useAssistantClientDestroySignal } from "@assistant-ui/store/internal";
import { ThreadRuntimeImpl } from "../../../runtime/api/thread-runtime";
import {
  NestedSubscriptionSubject,
  ShallowMemoizeSubject,
} from "../../../subscribable/subscribable";
import { ThreadClient } from "../../../store/runtime-clients/thread-runtime-client";
import type { ClientThreadListRuntimeCore } from "./ClientThreadListRuntimeCore";
import { EMPTY_THREAD_CORE } from "../../../runtimes/remote-thread-list/empty-thread-core";

type ThreadOptions = {
  clientCore: ClientThreadListRuntimeCore;
  threadId?: string | undefined;
  startThread?: boolean | undefined;
};

const useHostedThreadRuntime = ({
  clientCore,
  threadId,
  startThread,
}: Pick<ThreadOptions, "clientCore" | "threadId" | "startThread">) => {
  const aui = useAui();
  const manager = clientCore.hookManager;
  const id = threadId!;
  const destroySignal = useAssistantClientDestroySignal();
  useEffect(() => {
    if (startThread) void manager.startThreadRuntime(id).catch(() => {});
    const stop = () => manager.stopThreadRuntime(id);
    destroySignal?.addEventListener("abort", stop, { once: true });
    return () => destroySignal?.removeEventListener("abort", stop);
  }, [manager, id, destroySignal, startThread]);
  return useMemo(
    () =>
      new ThreadRuntimeImpl(
        new NestedSubscriptionSubject({
          path: {
            ref: `threads[${id}]`,
            threadSelector: { type: "threadId", threadId: id },
          },
          getState: () => manager.getThreadRuntimeCore(id) ?? EMPTY_THREAD_CORE,
          subscribe: (callback) => manager.subscribe(callback),
        }),
        new ShallowMemoizeSubject({
          path: {
            ref: `threadItems[${id}]`,
            threadSelector: { type: "threadId", threadId: id },
          },
          getState: () => ({ ...aui.threadListItem.getState(), isMain: false }),
          subscribe: aui.subscribe,
        }),
      ),
    [manager, aui, id],
  );
};

const useStableClientThreadRuntime = (options: ThreadOptions) => {
  const aui = useAui();
  const auiRef = useRef(aui);
  useInsertionEffect(() => {
    auiRef.current = aui;
  }, [aui]);
  const stableAui = useMemo(
    () =>
      createClientFacade({
        getClient: () => auiRef.current,
        subscribe: (listener) => auiRef.current.subscribe(listener),
      }),
    [],
  );
  return useAssistantContextProvider(stableAui, function useHostedRuntime() {
    return useHostedThreadRuntime(options);
  });
};

const useRemoteThreadListRuntimeThread = (options: ThreadOptions) => {
  const runtime = useStableClientThreadRuntime(options);
  return useResource(ThreadClient({ runtime }));
};

export const RemoteThreadListRuntimeThread = resource(
  useRemoteThreadListRuntimeThread,
);

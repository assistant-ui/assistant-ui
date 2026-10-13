import { useEffect, useMemo, useRef } from "react";
import { resource, useResource, withKey } from "@assistant-ui/tap";
import {
  attachTransformScopes,
  useAssistantClientRef,
  useAssistantScopeEffect,
} from "@assistant-ui/store/client";
import { RemoteThreadList } from "../../client/RemoteThreadList";
import { inMemoryThreadListTransformScopes } from "../../client/InMemoryThreadList";
import type { AssistantRuntime } from "../../../runtime/api/assistant-runtime";
import type { ModelContextProvider } from "../../../model-context/types";
import type { RemoteThreadListOptions } from "../../../runtimes/remote-thread-list/types";
import { WritableSubscribable } from "../../../subscribable/subscribable";
import { useSubscribable } from "../../../store/runtime-clients/useSubscribable";
import { RemoteThreadListRuntimeThread } from "./RemoteThreadListRuntimeThread";
import type { ClientThreadListRuntimeCore } from "./ClientThreadListRuntimeCore";

const useRemoteThreadListRuntimeThreads = ({
  optionsStore,
  generationStore,
  assistantRuntime,
  modelContext,
  initialThreadIdSeed,
  clientCore,
}: {
  optionsStore: WritableSubscribable<RemoteThreadListOptions>;
  generationStore: WritableSubscribable<number>;
  assistantRuntime: AssistantRuntime;
  modelContext: ModelContextProvider;
  initialThreadIdSeed?: string | undefined;
  clientCore?: ClientThreadListRuntimeCore | undefined;
}) => {
  const options = useSubscribable(optionsStore);
  const generation = useSubscribable(generationStore);
  const threadOptions = useMemo(
    () => ({ optionsStore, modelContext }),
    [optionsStore, modelContext],
  );
  const thread = useMemo(() => {
    const elements = new Map<
      string,
      ReturnType<typeof RemoteThreadListRuntimeThread>
    >();
    return (id: string) => {
      const key = `${id}:${generation}`;
      let element = elements.get(key);
      if (!element) {
        element = withKey(key, RemoteThreadListRuntimeThread(threadOptions));
        elements.set(key, element);
      }
      return element;
    };
  }, [generation, threadOptions]);
  const clientRef = useAssistantClientRef();
  useEffect(() => {
    clientCore?.__internal_bindClient(clientRef.current!);
  }, [clientCore, clientRef]);
  useAssistantScopeEffect(
    "modelContext",
    () =>
      assistantRuntime.registerModelContextProvider(
        clientRef.current!.modelContext(),
      ),
    [assistantRuntime],
  );

  const previousAdapter = useRef(options.adapter);
  const initialThreadId = useRef(options.initialThreadId);
  useEffect(() => {
    if (options.threadId !== undefined || initialThreadId.current === undefined)
      return;
    void clientRef
      .current!.threads.__internal_getRawActions?.()
      .switchToThread(initialThreadId.current)
      .catch(() => {});
  }, [clientRef]);
  useEffect(() => {
    const previous = previousAdapter.current;
    previousAdapter.current = options.adapter;
    if (previous === options.adapter) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void clientRef.current!.threads.reload();
    });
    return () => {
      cancelled = true;
    };
  }, [clientRef, options.adapter]);

  const threads = useResource(
    RemoteThreadList({
      adapter: options.adapter,
      thread,
      threadId: options.threadId,
      onThreadIdChange: options.onThreadIdChange,
      backgroundThreads: true,
      __internal_initialThreadIdSeed: initialThreadIdSeed,
    }),
  );
  return {
    ...threads,
    reloadMainThread: () =>
      clientCore?.reloadMainThread() ?? threads.reloadMainThread(),
    __internal_getAssistantRuntime: () => assistantRuntime,
  };
};

export const RemoteThreadListRuntimeThreads = resource(
  useRemoteThreadListRuntimeThreads,
);

attachTransformScopes(
  useRemoteThreadListRuntimeThreads,
  inMemoryThreadListTransformScopes,
);

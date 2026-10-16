import { useEffect, useMemo, useRef, useState } from "react";
import { resource, useResource, withKey } from "@assistant-ui/tap";
import {
  attachTransformScopes,
  useAssistantClientRef,
  useAssistantScopeEffect,
} from "@assistant-ui/store/client";
import { RemoteThreadList } from "../../client/RemoteThreadList";
import { inMemoryThreadListTransformScopes } from "../../client/InMemoryThreadList";
import type { AssistantRuntime } from "../../../runtime/api/assistant-runtime";
import type { RemoteThreadListOptions } from "../../../runtimes/remote-thread-list/types";
import { WritableSubscribable } from "../../../subscribable/subscribable";
import { useSubscribable } from "../../../store/runtime-clients/useSubscribable";
import { RemoteThreadListRuntimeThread } from "./RemoteThreadListRuntimeThread";
import type { ClientThreadListRuntimeCore } from "./ClientThreadListRuntimeCore";

const INITIAL_GENERATION = {
  getState: () => 0,
  getServerSnapshot: () => 0,
  subscribe: () => () => {},
};

const useRemoteThreadListRuntimeThreads = ({
  optionsStore,
  generationStore,
  assistantRuntime,
  initialThreadIdSeed,
  clientCore,
}: {
  optionsStore: WritableSubscribable<RemoteThreadListOptions>;
  generationStore?: WritableSubscribable<number> | undefined;
  assistantRuntime: AssistantRuntime | (() => AssistantRuntime);
  initialThreadIdSeed?: string | undefined;
  clientCore: ClientThreadListRuntimeCore;
}) => {
  const options = useSubscribable(optionsStore);
  const generation = useSubscribable(generationStore ?? INITIAL_GENERATION);
  const [startThread, setStartThread] = useState(
    options.threadId !== undefined || options.initialThreadId === undefined,
  );
  const threadOptions = useMemo(
    () => ({ clientCore, startThread }),
    [clientCore, startThread],
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
        element = withKey(
          key,
          RemoteThreadListRuntimeThread({ ...threadOptions, threadId: id }),
        );
        elements.set(key, element);
      }
      return element;
    };
  }, [generation, threadOptions]);
  const clientRef = useAssistantClientRef();
  useAssistantScopeEffect(
    "modelContext",
    () =>
      (typeof assistantRuntime === "function"
        ? assistantRuntime()
        : assistantRuntime
      ).registerModelContextProvider(clientRef.current!.modelContext()),
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
      .finally(() => setStartThread(true))
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
      __internal_ensureThread: clientCore.__internal_ensureThread,
      __internal_isThreadAttached: clientCore.__internal_isThreadAttached,
      __internal_initialThreadIdSeed: initialThreadIdSeed,
      __internal_preserveDraftOnAdapterChange: true,
      __internal_reopenControlledThreadOnAdapterChange: true,
    }),
  );
  return {
    ...threads,
    reloadMainThread: () => clientCore.reloadMainThread(),
    __internal_getAssistantRuntime: () =>
      typeof assistantRuntime === "function"
        ? assistantRuntime()
        : assistantRuntime,
  };
};

export const RemoteThreadListRuntimeThreads = resource(
  useRemoteThreadListRuntimeThreads,
);

attachTransformScopes(
  useRemoteThreadListRuntimeThreads,
  inMemoryThreadListTransformScopes,
);

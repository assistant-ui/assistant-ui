import { useEffect, useRef } from "react";
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

const useRemoteThreadListRuntimeThreads = ({
  optionsStore,
  generationStore,
  assistantRuntime,
  modelContext,
  initialThreadIdSeed,
}: {
  optionsStore: WritableSubscribable<RemoteThreadListOptions>;
  generationStore: WritableSubscribable<number>;
  assistantRuntime: AssistantRuntime;
  modelContext: ModelContextProvider;
  initialThreadIdSeed?: string | undefined;
}) => {
  const options = useSubscribable(optionsStore);
  const generation = useSubscribable(generationStore);
  const clientRef = useAssistantClientRef();
  useAssistantScopeEffect(
    "modelContext",
    () =>
      assistantRuntime.registerModelContextProvider(
        clientRef.current!.modelContext(),
      ),
    [assistantRuntime],
  );

  const previousAdapter = useRef(options.adapter);
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

  return useResource(
    RemoteThreadList({
      adapter: options.adapter,
      thread: (id) =>
        withKey(
          `${id}:${generation}`,
          RemoteThreadListRuntimeThread({ optionsStore, modelContext }),
        ),
      threadId: options.threadId,
      onThreadIdChange: options.onThreadIdChange,
      backgroundThreads: true,
      __internal_initialThreadIdSeed: initialThreadIdSeed,
    }),
  );
};

export const RemoteThreadListRuntimeThreads = resource(
  useRemoteThreadListRuntimeThreads,
);

attachTransformScopes(
  useRemoteThreadListRuntimeThreads,
  inMemoryThreadListTransformScopes,
);

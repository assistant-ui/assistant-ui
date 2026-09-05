import { useCallback, useEffect, useEffectEvent, useMemo, useRef } from "react";
import { resource } from "@assistant-ui/tap";
import {
  useAssistantContextProvider,
  useConfiguredAui,
} from "@assistant-ui/store/client";
import { ThreadListItemClient } from "../../store/internal";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type { ThreadListRuntimeCore } from "../../runtime/interfaces/thread-list-runtime-core";
import type { ThreadRuntimeCore } from "../../runtime/interfaces/thread-runtime-core";
import type { ThreadRuntimeImpl } from "../../runtime/api/thread-runtime";
import {
  ThreadListItemRuntimeImpl,
  type ThreadListItemRuntime,
} from "../../runtime/api/thread-list-item-runtime";
import {
  SKIP_UPDATE,
  ShallowMemoizeSubject,
} from "../../subscribable/subscribable";
import {
  useRuntimeAdaptersProvider,
  type RuntimeAdapters,
} from "./RuntimeAdapterProvider";
import { isSilentRuntimeAction } from "../../utils/silent-runtime-action";
import { isTitleSourceMessage } from "../../runtimes/remote-thread-list/title";

export type RemoteThreadListHook = () => AssistantRuntime;

export type RemoteThreadResourceProps = {
  threadId: string;
  generation: number;
  parentList: ThreadListRuntimeCore;
  runtimeHook: RemoteThreadListHook;
  parentClient: Parameters<typeof useConfiguredAui>[0];
  adapters: RuntimeAdapters | null;
  publish: (
    threadId: string,
    runtime: ThreadRuntimeCore,
    generation: number,
  ) => void;
};

export const subscribeToTitleGeneration = (
  threadRuntime: AssistantRuntime["thread"],
  itemRuntime: ThreadListItemRuntime,
) => {
  const generate = () =>
    void itemRuntime
      .generateTitle({ automatic: true })
      .catch((error: unknown) => {
        if (isSilentRuntimeAction(error)) return;
        console.error("[assistant-ui] Thread title generation failed", error);
      });

  const hasTitleSource = () =>
    threadRuntime.getState().messages.some(isTitleSourceMessage);

  if (hasTitleSource()) {
    generate();
    return () => {};
  }

  const unsubscribe = threadRuntime.subscribe(() => {
    if (!hasTitleSource()) return;
    unsubscribe();
    generate();
  });
  return unsubscribe;
};

const useRemoteThreadBinder = ({
  threadId,
  generation,
  runtimeHook,
  publish,
  itemRuntime,
}: {
  threadId: string;
  generation: number;
  runtimeHook: RemoteThreadListHook;
  publish: RemoteThreadResourceProps["publish"];
  itemRuntime: ThreadListItemRuntime;
}) => {
  const runtime = runtimeHook();
  const threadBinding = (runtime?.thread as ThreadRuntimeImpl | undefined)
    ?.__internal_threadBinding;

  const updateRuntime = useCallback(() => {
    if (!threadBinding) return;
    publish(threadId, threadBinding.getState(), generation);
  }, [threadId, generation, threadBinding, publish]);

  const isMounted = useRef(false);
  if (!isMounted.current) {
    updateRuntime();
  }

  useEffect(() => {
    if (!threadBinding) return undefined;
    isMounted.current = true;
    updateRuntime();
    return threadBinding.outerSubscribe(updateRuntime);
  }, [threadBinding, updateRuntime]);

  const initPromiseRef = useRef<Promise<unknown> | undefined>(undefined);
  const hasInitializedRef = useRef(false);
  const titleDisposeRef = useRef<(() => void) | undefined>(undefined);
  const titleAliveRef = useRef(false);

  const handleInitialize = useEffectEvent(() => {
    if (hasInitializedRef.current) return;

    const state = itemRuntime.getState();
    if (state.status !== "new") return;
    hasInitializedRef.current = true;

    const initPromise = itemRuntime.initialize();
    initPromiseRef.current = initPromise;

    // The title needs the thread to exist and its first message, so it arms
    // when initialization resolves rather than at the first runEnd; waiting
    // for the run would leave the thread on "New Chat" for the whole
    // response, and forever when the run never completes.
    void initPromise.then(
      () => {
        if (!titleAliveRef.current) return;
        titleDisposeRef.current?.();
        titleDisposeRef.current = subscribeToTitleGeneration(
          runtime.thread,
          itemRuntime,
        );
      },
      () => {
        if (initPromiseRef.current === initPromise) {
          initPromiseRef.current = undefined;
          hasInitializedRef.current = false;
        }
      },
    );
  });

  const getInitializePromise = useEffectEvent(() => {
    handleInitialize();
    return initPromiseRef.current;
  });

  useEffect(() => {
    if (!threadBinding) return;
    const runtimeCore = threadBinding.getState();
    const setGetInitializePromise = (runtimeCore as Record<string, unknown>)
      .__internal_setGetInitializePromise;
    if (typeof setGetInitializePromise === "function") {
      setGetInitializePromise.call(runtimeCore, getInitializePromise);
    }
  }, [threadBinding]);
  useEffect(() => {
    if (!runtime?.threads?.main) return undefined;
    hasInitializedRef.current = false;
    titleAliveRef.current = true;
    const unsubscribe = runtime.threads.main.unstable_on(
      "initialize",
      handleInitialize,
    );
    return () => {
      titleAliveRef.current = false;
      unsubscribe();
      titleDisposeRef.current?.();
      titleDisposeRef.current = undefined;
    };
  }, [runtime]);

  return runtime;
};

const useRemoteThreadResource = ({
  threadId,
  generation,
  parentList,
  runtimeHook,
  parentClient,
  adapters,
  publish,
}: RemoteThreadResourceProps) => {
  const itemRuntime = useMemo(
    () =>
      new ThreadListItemRuntimeImpl(
        new ShallowMemoizeSubject({
          path: {
            ref: `threadItems[threadId=${threadId}]`,
            threadSelector: { type: "threadId", threadId },
          },
          getState: () => {
            const data = parentList.getItemById(threadId);
            if (!data) return SKIP_UPDATE;
            return {
              id: data.id,
              remoteId: data.remoteId,
              externalId: data.externalId,
              title: data.title,
              lastMessageAt: data.lastMessageAt,
              custom: data.custom,
              status: data.status,
              isMain: data.id === parentList.mainThreadId,
              isRunning:
                parentList.unstable_isThreadRunning?.(data.id) ?? false,
            };
          },
          subscribe: (callback) => parentList.subscribe(callback),
        }),
        parentList,
      ),
    [parentList, threadId],
  );

  const { client } = useConfiguredAui(parentClient, {
    threadListItem: ThreadListItemClient({ runtime: itemRuntime }),
  });

  return useAssistantContextProvider(client, function useThreadClient() {
    return useRuntimeAdaptersProvider(adapters, function useBoundRuntime() {
      return useRemoteThreadBinder({
        threadId,
        generation,
        runtimeHook,
        publish,
        itemRuntime,
      });
    });
  });
};

export const RemoteThreadResource = resource(useRemoteThreadResource);

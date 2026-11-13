"use client";

import { useEffect, useInsertionEffect, useMemo, useState } from "react";
import { ExternalStoreRuntimeCore } from "../../runtimes/internal";
import type { ExternalStoreAdapter } from "../../runtimes/external-store/external-store-adapter";
import type { ThreadHistoryAdapter } from "../../adapters/thread-history";
import type { ModelContextProvider } from "../../model-context/types";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import { AssistantRuntimeImpl } from "../../runtime/internal";
import {
  disposeThreadRuntime,
  invalidateThreadRuntime,
} from "../../runtime/utils/thread-runtime-lifecycle";
import { useRuntimeAdapters } from "./RuntimeAdapterProvider";
import { ExternalStoreHistoryCopy } from "./external-store-history-copy";
import { useReplaySafeEffect } from "@assistant-ui/store/internal";
import { useIsRemoteThreadRuntimeHosted } from "./RemoteThreadRuntimeHostContext";

// Module scope isolates stable callbacks from the render's V8 context containing adapters and messages.
const useRuntimeLifetime = (
  isHosted: boolean,
  lifetime: { generation: number },
  runtime: ExternalStoreRuntimeCore,
) => {
  useInsertionEffect(() => {
    if (isHosted) return;
    const generation = ++lifetime.generation;
    return () =>
      queueMicrotask(() => {
        if (lifetime.generation === generation) {
          disposeThreadRuntime(runtime.threads.getMainThreadRuntimeCore());
        }
      });
  }, [isHosted, lifetime, runtime]);

  useReplaySafeEffect(() => {
    return () => {
      invalidateThreadRuntime(runtime.threads.getMainThreadRuntimeCore());
    };
  }, [runtime]);
};

const useHistoryCopy = (
  copiesHistory: boolean,
  history: ThreadHistoryAdapter | undefined,
  historyCopy: ExternalStoreHistoryCopy,
  runtime: ExternalStoreRuntimeCore,
) => {
  useReplaySafeEffect(() => {
    if (!copiesHistory || !history) return;
    return historyCopy.attach(
      runtime.threads.getMainThreadRuntimeCore(),
      history,
    );
  }, [copiesHistory, history, historyCopy, runtime]);
};

const useRuntimeModelContext = (
  modelContext: ModelContextProvider | undefined,
  runtime: ExternalStoreRuntimeCore,
) => {
  useEffect(() => {
    if (!modelContext) return undefined;
    return runtime.registerModelContextProvider(modelContext);
  }, [modelContext, runtime]);
};

const createAssistantRuntime = (runtime: ExternalStoreRuntimeCore) => () =>
  new AssistantRuntimeImpl(runtime);

export const useExternalStoreRuntime = <T>(
  store: ExternalStoreAdapter<T>,
): AssistantRuntime => {
  const { modelContext, feedback, history } = useRuntimeAdapters() ?? {};
  const [historyCopy] = useState(() => new ExternalStoreHistoryCopy());
  const copiesHistory =
    !!history?.unstable_copy &&
    !store.unstable_persistsHistory &&
    !store.adapters?.threadList;
  const adaptedStore = useMemo(() => {
    const withFeedback =
      feedback && !store.adapters?.feedback
        ? { ...store, adapters: { ...store.adapters, feedback } }
        : store;
    if (!copiesHistory || store.unstable_onRecordToolInteraction) {
      return withFeedback;
    }
    return {
      ...withFeedback,
      unstable_onRecordToolInteraction: historyCopy.recordInteraction,
    };
  }, [copiesHistory, feedback, historyCopy, store]);
  const [runtime] = useState(() => new ExternalStoreRuntimeCore(adaptedStore));
  const isHosted = useIsRemoteThreadRuntimeHosted();
  const [lifetime] = useState(() => ({ generation: 0 }));

  useRuntimeLifetime(isHosted, lifetime, runtime);

  useEffect(() => {
    runtime.setAdapter(adaptedStore);
  });

  useHistoryCopy(copiesHistory, history, historyCopy, runtime);
  useRuntimeModelContext(modelContext, runtime);

  const [assistantRuntime] = useState(createAssistantRuntime(runtime));
  return assistantRuntime;
};

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AssistantRuntime,
  ChatModelAdapter,
  ThreadMessageLike,
} from "../../index";
import type { LocalRuntimeOptionsBase } from "../../runtimes/local/local-runtime-options";
import { AssistantRuntimeImpl, LocalRuntimeCore } from "../../internal";
import { useAuiState } from "@assistant-ui/store";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";
import { useCloudThreadListAdapter } from "./cloud/useCloudThreadListAdapter";
import { useRuntimeAdapters } from "./RuntimeAdapterProvider";
import type { AssistantCloud } from "assistant-cloud";

export type LocalRuntimeOptions = Omit<LocalRuntimeOptionsBase, "adapters"> & {
  cloud?: AssistantCloud | undefined;
  initialMessages?: readonly ThreadMessageLike[] | undefined;
  adapters?: Omit<LocalRuntimeOptionsBase["adapters"], "chatModel"> | undefined;
};

const useLocalThreadRuntime = (
  chatModel: ChatModelAdapter,
  { initialMessages, ...options }: LocalRuntimeOptions,
): AssistantRuntime => {
  const { modelContext, ...threadListAdapters } = useRuntimeAdapters() ?? {};
  const opt = {
    ...options,
    adapters: {
      ...threadListAdapters,
      ...options.adapters,
      chatModel,
    },
  };

  const [runtime] = useState(() => new LocalRuntimeCore(opt, initialMessages));

  const threadIdRef = useRef<string | undefined>(undefined);
  const historyLoadPromiseRef = useRef<Promise<void> | undefined>(undefined);
  threadIdRef.current = useAuiState((s) => s.threadListItem.remoteId);

  useEffect(() => {
    runtime.threads
      .getMainThreadRuntimeCore()
      .__internal_setGetThreadId(() => threadIdRef.current);
  }, [runtime]);

  useEffect(() => {
    return () => {
      runtime.threads.getMainThreadRuntimeCore().detach();
    };
  }, [runtime]);

  useEffect(() => {
    runtime.threads.getMainThreadRuntimeCore().__internal_setOptions(opt);
  });

  useEffect(() => {
    const loadPromise = runtime.threads
      .getMainThreadRuntimeCore()
      .__internal_load();
    if (historyLoadPromiseRef.current === loadPromise) return;

    historyLoadPromiseRef.current = loadPromise;
    void loadPromise.catch((error: unknown) => {
      console.error("[assistant-ui] local thread history load failed:", error);
    });
  }, [runtime]);

  useEffect(() => {
    if (!modelContext) return undefined;
    return runtime.registerModelContextProvider(modelContext);
  }, [modelContext, runtime]);

  return useMemo(() => new AssistantRuntimeImpl(runtime), [runtime]);
};

export const splitLocalRuntimeOptions = <T extends LocalRuntimeOptions>(
  options: T,
) => {
  const {
    cloud,
    initialMessages,
    maxSteps,
    adapters,
    unstable_humanToolNames,
    unstable_enableMessageQueue,
    ...rest
  } = options;

  return {
    localRuntimeOptions: {
      cloud,
      initialMessages,
      maxSteps,
      adapters,
      unstable_humanToolNames,
      unstable_enableMessageQueue,
    },
    otherOptions: rest,
  };
};

export const useLocalRuntime = (
  chatModel: ChatModelAdapter,
  { cloud, ...options }: LocalRuntimeOptions = {},
): AssistantRuntime => {
  const cloudAdapter = useCloudThreadListAdapter({ cloud });
  return useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useLocalThreadRuntime(chatModel, options);
    },
    adapter: cloudAdapter,
    allowNesting: true,
  });
};

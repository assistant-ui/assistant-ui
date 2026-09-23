import {
  useEffect,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AssistantRuntime,
  ChatModelAdapter,
  ThreadMessageLike,
} from "../../index";
import type { LocalRuntimeOptionsBase } from "../../runtimes/local/local-runtime-options";
import { AssistantRuntimeImpl, LocalRuntimeCore } from "../../internal";
import { useAui } from "@assistant-ui/store";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";
import { useCloudThreadListAdapter } from "./cloud/useCloudThreadListAdapter";
import { useRuntimeAdapters } from "./RuntimeAdapterProvider";
import type { AssistantCloud } from "assistant-cloud";
import { disposeThreadRuntime } from "../../runtime/utils/thread-runtime-lifecycle";

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

  const aui = useAui();
  const historyLoadPromiseRef = useRef<Promise<void> | undefined>(undefined);

  // A run reads the id in the microtask after the initialization barrier,
  // before the store has flushed the remote id into React state.
  useEffect(() => {
    runtime.threads
      .getMainThreadRuntimeCore()
      .__internal_setGetThreadId(
        () => aui.threadListItem.__internal_getRuntime?.().getState().remoteId,
      );
  }, [aui, runtime]);

  useInsertionEffect(() => {
    return () => {
      queueMicrotask(() => {
        const thread = runtime.threads.getMainThreadRuntimeCore();
        disposeThreadRuntime(thread);
        thread.detach();
      });
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
    unstable_queueClearOnRewind,
    unstable_queueClearOnCancel,
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
      unstable_queueClearOnRewind,
      unstable_queueClearOnCancel,
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

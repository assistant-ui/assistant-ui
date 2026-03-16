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
import {
  createLocalStorageAdapter,
  type AsyncStorageLike,
} from "../adapters/LocalStorageThreadListAdapter";
import type { TitleGenerationAdapter } from "../adapters/TitleGenerationAdapter";

export type LocalRuntimeOptions = Omit<LocalRuntimeOptionsBase, "adapters"> & {
  cloud?: AssistantCloud | undefined;
  storage?: AsyncStorageLike | undefined;
  storagePrefix?: string | undefined;
  titleGenerator?: TitleGenerationAdapter | undefined;
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
    runtime.threads.getMainThreadRuntimeCore().__internal_load();
  });

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
    storage,
    storagePrefix,
    titleGenerator,
    initialMessages,
    maxSteps,
    adapters,
    unstable_humanToolNames,
    ...rest
  } = options;

  return {
    localRuntimeOptions: {
      cloud,
      storage,
      storagePrefix,
      titleGenerator,
      initialMessages,
      maxSteps,
      adapters,
      unstable_humanToolNames,
    },
    otherOptions: rest,
  };
};

export const useLocalRuntime = (
  chatModel: ChatModelAdapter,
  {
    cloud,
    storage,
    storagePrefix,
    titleGenerator,
    ...options
  }: LocalRuntimeOptions = {},
): AssistantRuntime => {
  if (storage && cloud) {
    throw new Error(
      "useLocalRuntime: `storage` and `cloud` options are mutually exclusive. Provide only one.",
    );
  }

  const cloudAdapter = useCloudThreadListAdapter({ cloud });
  const localStorageAdapter = useMemo(() => {
    if (!storage) return undefined;
    return createLocalStorageAdapter({
      storage,
      prefix: storagePrefix,
      titleGenerator,
    });
  }, [storage, storagePrefix, titleGenerator]);

  return useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useLocalThreadRuntime(chatModel, options);
    },
    adapter: localStorageAdapter ?? cloudAdapter,
    allowNesting: true,
  });
};

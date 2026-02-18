import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AssistantRuntime,
  ChatModelAdapter,
  ThreadMessageLike,
  RemoteThreadListAdapter,
} from "@assistant-ui/core";
import { InMemoryThreadListAdapter } from "@assistant-ui/core";
import type { LocalRuntimeOptionsBase } from "@assistant-ui/core/internal";
import {
  AssistantRuntimeImpl,
  LocalRuntimeCore,
} from "@assistant-ui/core/internal";
import { useAuiState } from "@assistant-ui/store";
import type { TitleGenerationAdapter } from "../adapters/TitleGenerationAdapter";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";
import { createLocalStorageAdapter } from "../adapters/LocalStorageThreadListAdapter";
import { useRuntimeAdapters } from "../context/providers/RuntimeAdapterProvider";

type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type LocalRuntimeOptions = Omit<LocalRuntimeOptionsBase, "adapters"> & {
  adapters?: Omit<LocalRuntimeOptionsBase["adapters"], "chatModel"> | undefined;
  initialMessages?: readonly ThreadMessageLike[] | undefined;
  titleGenerator?: TitleGenerationAdapter | undefined;
  storage?: AsyncStorageLike | undefined;
  storagePrefix?: string | undefined;
};

const useInnerLocalRuntime = (
  chatModel: ChatModelAdapter,
  options: Omit<
    LocalRuntimeOptions,
    "titleGenerator" | "storage" | "storagePrefix"
  >,
): AssistantRuntime => {
  const { initialMessages, ...restOptions } = options;
  const runtimeAdapters = useRuntimeAdapters();

  const opt: LocalRuntimeOptionsBase = {
    ...restOptions,
    adapters: {
      ...runtimeAdapters,
      ...restOptions.adapters,
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

  return useMemo(() => new AssistantRuntimeImpl(runtime), [runtime]);
};

export const useLocalRuntime = (
  chatModel: ChatModelAdapter,
  options: LocalRuntimeOptions = {},
): AssistantRuntime => {
  const { titleGenerator, storage, storagePrefix, ...innerOptions } = options;

  const adapter: RemoteThreadListAdapter = useMemo(() => {
    if (!storage) return new InMemoryThreadListAdapter();
    return createLocalStorageAdapter({
      storage,
      prefix: storagePrefix,
      titleGenerator,
    });
  }, [storage, storagePrefix, titleGenerator]);

  return useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useInnerLocalRuntime(chatModel, innerOptions);
    },
    adapter,
    allowNesting: true,
  });
};

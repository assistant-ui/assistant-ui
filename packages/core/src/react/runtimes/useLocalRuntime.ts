import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
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
import { useReplaySafeEffect } from "@assistant-ui/store/internal";

const subscribeNever = () => () => {};

export type LocalRuntimeOptions = Omit<LocalRuntimeOptionsBase, "adapters"> & {
  cloud?: AssistantCloud | undefined;
  /**
   * Stable identity for the account or workspace owning Cloud runtime state.
   * Provide it from the first render and change it when that scope changes.
   */
  scopeId?: string | undefined;
  /** A message without an id gets a generated id, and a message without createdAt is stamped with the current time. Set createdAt on each initial message when prerendering a page with Next.js cacheComponents. With a history adapter, they survive an empty load, and those still in the thread are written to history before the first write for another message or when a run settles one of them, under the ids they carry, so a history adapter that keys messages across threads needs ids that differ per thread. A non-empty load replaces them. */
  initialMessages?: readonly ThreadMessageLike[] | undefined;
  adapters?: Omit<LocalRuntimeOptionsBase["adapters"], "chatModel"> | undefined;
};

const useLocalThreadRuntime = (
  chatModel: ChatModelAdapter,
  { initialMessages, ...options }: LocalRuntimeOptions,
  messageIdSeed: string | undefined,
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

  const [runtime] = useState(() => {
    const messages =
      messageIdSeed !== undefined
        ? initialMessages?.map((message, index) => ({
            ...message,
            id: message.id ?? `${messageIdSeed}-message-${index}`,
            content:
              typeof message.content === "string"
                ? message.content
                : message.content.map((part, partIndex) =>
                    part.type === "tool-call" && !part.toolCallId
                      ? {
                          ...part,
                          toolCallId: `${messageIdSeed}-tool-${index}-${partIndex}`,
                        }
                      : part,
                  ),
          }))
        : initialMessages;
    return new LocalRuntimeCore(opt, messages);
  });

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

  useReplaySafeEffect(() => {
    return () => {
      runtime.threads.getMainThreadRuntimeCore().detach();
    };
  }, [runtime]);

  useLayoutEffect(() => {
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

  const [assistantRuntime] = useState(() => new AssistantRuntimeImpl(runtime));
  return assistantRuntime;
};

export const splitLocalRuntimeOptions = <T extends LocalRuntimeOptions>(
  options: T,
) => {
  const {
    cloud,
    scopeId,
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
      scopeId,
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
  { cloud, scopeId, ...options }: LocalRuntimeOptions = {},
): AssistantRuntime => {
  const messageIdSeed = useId();
  const needsMessageIdSeed =
    options.initialMessages?.some(
      (message) =>
        message.id === undefined ||
        (typeof message.content !== "string" &&
          message.content.some(
            (part) => part.type === "tool-call" && !part.toolCallId,
          )),
    ) ?? false;
  const isHydrating = useSyncExternalStore(
    subscribeNever,
    () => false,
    () => needsMessageIdSeed,
  );
  const cloudAdapter = useCloudThreadListAdapter({ cloud, scopeId });
  return useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useLocalThreadRuntime(
        chatModel,
        options,
        isHydrating ? messageIdSeed : undefined,
      );
    },
    adapter: cloudAdapter,
    allowNesting: true,
  });
};

"use client";

import { Chat, useChat, type UIMessage } from "@ai-sdk/react";
import type { MessageRepository } from "@assistant-ui/core/internal";
import {
  pickExternalStoreSharedOptions,
  type AssistantRuntime,
  type ExternalStoreSharedOptions,
} from "@assistant-ui/core";
import {
  useAISDKRuntime,
  type AISDKRuntimeAdapter,
  type CustomToCreateMessageFunction,
} from "./useAISDKRuntime";
import type { ChatInit } from "ai";
import {
  AssistantChatTransport,
  type InitializableThreadListItem,
} from "../transport/AssistantChatTransport";
import type { ResumableClientStorage } from "../transport/resumable";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useResourceCleanup } from "./useResourceCleanup";
import { DynamicChatTransport } from "./DynamicChatTransport";
import { getResumableAdapter } from "./getResumableAdapter";
import { useDynamicChatTransport } from "./useDynamicChatTransport";

export type ChatThreadOptions<UI_MESSAGE extends UIMessage = UIMessage> =
  ChatInit<UI_MESSAGE> &
    ExternalStoreSharedOptions & {
      throttle?: number | undefined;
      adapters?: AISDKRuntimeAdapter["adapters"] | undefined;
      toCreateMessage?: CustomToCreateMessageFunction;
      onResume?: AISDKRuntimeAdapter["onResume"];
      onResumeToolCall?: AISDKRuntimeAdapter["onResumeToolCall"];
      onRespondToToolApproval?: AISDKRuntimeAdapter["onRespondToToolApproval"];
      /**
       * Called when an automatic resumable stream reconnect fails. Use this to
       * surface a toast, report telemetry, or mark the thread as needing a
       * retry. The failed stream id is cleared after the callback unless a
       * newer id has replaced it.
       */
      onResumeError?: ((error: unknown) => void) | undefined;
      joinStrategy?: AISDKRuntimeAdapter["joinStrategy"];
      messageRepository?: AISDKRuntimeAdapter<UI_MESSAGE>["messageRepository"];
      unstable_onBranchChange?: AISDKRuntimeAdapter["unstable_onBranchChange"];
    };

export type ChatThreadEnvironment<UI_MESSAGE extends UIMessage = UIMessage> = {
  id: string;
  isMainThread: boolean;
  getThreadListItem: () => InitializableThreadListItem | undefined;
  stopOnClientDestroy?: boolean;
  /**
   * Aborts when the React component hosting the runtime is deleted. A nested
   * runtime resolves the destroy signal of the provider above it, which
   * outlives the nested component, so this stops the chat on its own unmount.
   */
  hostDestroySignal?: AbortSignal | undefined;
  /**
   * An externally owned chat instance. State lives on the instance, so it
   * survives the hosting resource unmounting; construction options are read
   * from the instance.
   */
  chat?: Chat<UI_MESSAGE> | undefined;
  /**
   * An externally owned per-thread message repository. Hosts that route
   * multiple threads through one mounting pass a distinct instance per
   * thread so histories and branches stay isolated.
   */
  messageRepositoryInstance?: MessageRepository | undefined;
};

type ChatThreadTransportBinding = {
  runtime: AssistantRuntime;
  getThreadListItem: () => InitializableThreadListItem | undefined;
};

const getNoPendingStreamId = () => null;

const resumedStreamIdsByStorage = new WeakMap<
  ResumableClientStorage,
  Set<string>
>();

const getResumedStreamIds = (storage: ResumableClientStorage | undefined) => {
  if (!storage) return new Set<string>();
  let resumedStreamIds = resumedStreamIdsByStorage.get(storage);
  if (!resumedStreamIds) {
    resumedStreamIds = new Set();
    resumedStreamIdsByStorage.set(storage, resumedStreamIds);
  }
  return resumedStreamIds;
};

/**
 * Splits the combined options into the assistant-ui side and the `ChatInit`
 * remainder the AI SDK consumes, so external `Chat` construction forwards the
 * same fields `useChat` would.
 */
export const splitChatThreadOptions = <UI_MESSAGE extends UIMessage>(
  options: ChatThreadOptions<UI_MESSAGE> | undefined,
) => {
  const {
    adapters,
    transport,
    throttle,
    toCreateMessage,
    isDisabled: _isDisabled,
    isSendDisabled: _isSendDisabled,
    unstable_capabilities: _unstable_capabilities,
    suggestions: _suggestions,
    onResume,
    onResumeToolCall,
    onRespondToToolApproval,
    onResumeError,
    joinStrategy,
    messageRepository,
    unstable_onBranchChange,
    ...chatInit
  } = options ?? {};
  // peel guard: any shared key left in `chatInit` collapses this to `never`
  true satisfies keyof typeof chatInit &
    keyof ExternalStoreSharedOptions extends never
    ? true
    : never;
  return {
    adapters,
    transport,
    throttle,
    toCreateMessage,
    onResume,
    onResumeToolCall,
    onRespondToToolApproval,
    onResumeError,
    joinStrategy,
    messageRepository,
    unstable_onBranchChange,
    chatInit,
  };
};

type ChatCallbacks<UI_MESSAGE extends UIMessage> = Pick<
  ChatInit<UI_MESSAGE>,
  "onToolCall" | "onData" | "onFinish" | "onError" | "sendAutomaticallyWhen"
>;

/**
 * Constructs a `Chat` whose callbacks read the latest options through
 * `callbacksRef`, the forwarding `useChat` applies only to a chat it
 * constructs itself.
 */
export const createChat = <UI_MESSAGE extends UIMessage>(
  init: ChatInit<UI_MESSAGE>,
  callbacksRef: { readonly current: ChatCallbacks<UI_MESSAGE> | undefined },
): Chat<UI_MESSAGE> =>
  new Chat<UI_MESSAGE>({
    ...init,
    onToolCall: (arg) => callbacksRef.current?.onToolCall?.(arg),
    onData: (arg) => callbacksRef.current?.onData?.(arg),
    onFinish: (arg) => callbacksRef.current?.onFinish?.(arg),
    onError: (arg) => callbacksRef.current?.onError?.(arg),
    sendAutomaticallyWhen: (arg) =>
      callbacksRef.current?.sendAutomaticallyWhen?.(arg) ?? false,
  });

export const useChatThread = <UI_MESSAGE extends UIMessage = UIMessage>(
  options: ChatThreadOptions<UI_MESSAGE> | undefined,
  env: ChatThreadEnvironment<UI_MESSAGE>,
): AssistantRuntime => {
  const {
    adapters,
    transport: transportOptions,
    throttle,
    toCreateMessage,
    onResume,
    onResumeToolCall,
    onRespondToToolApproval,
    onResumeError,
    joinStrategy,
    messageRepository,
    unstable_onBranchChange,
    chatInit: chatOptions,
  } = splitChatThreadOptions(options);

  const {
    id,
    isMainThread,
    getThreadListItem,
    stopOnClientDestroy = true,
    hostDestroySignal,
    chat: externalChat,
    messageRepositoryInstance,
  } = env;

  const defaultTransport = useMemo(() => new AssistantChatTransport(), []);
  const configuredTransport = transportOptions ?? defaultTransport;
  const transport = useDynamicChatTransport(
    configuredTransport,
    externalChat === undefined,
  );
  const transportContextOwner = useMemo(() => ({}), []);
  const getThreadListItemRef = useRef(getThreadListItem);
  useInsertionEffect(() => {
    getThreadListItemRef.current = getThreadListItem;
  }, [getThreadListItem]);
  const getCurrentThreadListItem = useCallback(
    () => getThreadListItemRef.current(),
    [],
  );
  const subscribeToTransport = useCallback(
    (callback: () => void) =>
      transport instanceof DynamicChatTransport
        ? transport.subscribe(callback)
        : () => {},
    [transport],
  );
  const getSourceTransport = useCallback(
    () =>
      transport instanceof DynamicChatTransport
        ? transport.getCurrentSourceTransport()
        : transport,
    [transport],
  );
  const sourceTransport = useSyncExternalStore(
    subscribeToTransport,
    getSourceTransport,
    getSourceTransport,
  );

  const transportBindingRef = useRef<ChatThreadTransportBinding | null>(null);
  // This is null when useMemo runs, so the proxy pins its mount render's binding. The fallback
  // serves only pre-commit sends; after insertion effects, transportBindingRef is authoritative.
  let initialTransportBinding: ChatThreadTransportBinding | null = null;
  const chatTransport = useMemo(
    () =>
      transport instanceof DynamicChatTransport
        ? transport.createThreadProxy(transportContextOwner, () => {
            const binding =
              transportBindingRef.current ?? initialTransportBinding;
            if (!binding) {
              throw new Error("Chat transport used before runtime setup");
            }
            return binding;
          })
        : transport,
    [initialTransportBinding, transport, transportContextOwner],
  );

  const latestChatOptionsRef = useRef(chatOptions);
  useEffect(() => {
    latestChatOptionsRef.current = chatOptions;
  });
  // `useChat` stops a chat it constructs whenever it unmounts, and a
  // resource's soft unmount runs that cleanup, so the thread owns its chat.
  const [ownedChat] = useState(
    () =>
      externalChat ??
      createChat(
        { ...chatOptions, id, transport: chatTransport },
        latestChatOptionsRef,
      ),
  );

  const chat = useChat({
    chat: externalChat ?? ownedChat,
    ...(throttle !== undefined && { throttle }),
  });

  useResourceCleanup(
    stopOnClientDestroy,
    () => {
      void chat.stop().catch(() => {});
    },
    hostDestroySignal,
  );

  const runtime = useAISDKRuntime(chat, {
    adapters,
    ...pickExternalStoreSharedOptions(options ?? {}),
    ...(toCreateMessage && { toCreateMessage }),
    ...(onResume && { onResume }),
    ...(onResumeToolCall && { onResumeToolCall }),
    ...(onRespondToToolApproval && { onRespondToToolApproval }),
    ...(joinStrategy && { joinStrategy }),
    ...(messageRepository && { messageRepository }),
    ...(messageRepositoryInstance && {
      unstable_messageRepositoryInstance: messageRepositoryInstance,
    }),
    ...(unstable_onBranchChange && { unstable_onBranchChange }),
  });
  initialTransportBinding = {
    runtime,
    getThreadListItem: getCurrentThreadListItem,
  };
  useInsertionEffect(() => {
    transportBindingRef.current = {
      runtime,
      getThreadListItem: getCurrentThreadListItem,
    };
  }, [runtime, getCurrentThreadListItem]);

  const registerTransportContext = useEffectEvent(
    (dynamicTransport: DynamicChatTransport<UI_MESSAGE>, chatId: string) => {
      dynamicTransport.setThreadContext(
        chatId,
        transportContextOwner,
        runtime,
        getCurrentThreadListItem,
      );
      return () =>
        dynamicTransport.unregisterThread(chatId, transportContextOwner);
    },
  );
  useInsertionEffect(() => {
    if (!(transport instanceof DynamicChatTransport)) return undefined;
    return registerTransportContext(transport, id);
  }, [id, runtime, transport, transportContextOwner]);

  if (
    !(transport instanceof DynamicChatTransport) &&
    configuredTransport instanceof AssistantChatTransport
  ) {
    configuredTransport.setRuntime(runtime);
    configuredTransport.__internal_setGetThreadListItem(
      getCurrentThreadListItem,
    );
  }

  const subscribeToRuntime = useCallback(
    (callback: () => void) => runtime.thread.subscribe(callback),
    [runtime],
  );
  const getHistoryLoadingSnapshot = useCallback(
    () => runtime.thread.getState().isLoading,
    [runtime],
  );
  const isLoadingHistory = useSyncExternalStore(
    subscribeToRuntime,
    getHistoryLoadingSnapshot,
    getHistoryLoadingSnapshot,
  );

  const resumableStorage = useMemo(
    () => getResumableAdapter(sourceTransport)?.storage,
    [sourceTransport],
  );

  const subscribeToResumableStorage = useCallback(
    (callback: () => void) =>
      isMainThread
        ? (resumableStorage?.subscribe?.(callback, id) ?? (() => {}))
        : () => {},
    [id, isMainThread, resumableStorage],
  );
  const getPendingStreamId = useCallback(
    () => (isMainThread ? (resumableStorage?.getStreamId(id) ?? null) : null),
    [id, isMainThread, resumableStorage],
  );
  const pendingStreamId = useSyncExternalStore(
    subscribeToResumableStorage,
    getPendingStreamId,
    getNoPendingStreamId,
  );
  const isChatRunning =
    chat.status === "submitted" || chat.status === "streaming";

  const resumedStreamIds = useMemo(
    () => getResumedStreamIds(resumableStorage),
    [resumableStorage],
  );
  const onResumeErrorRef = useRef(onResumeError);
  useEffect(() => {
    onResumeErrorRef.current = onResumeError;
  });
  useEffect(() => {
    if (!pendingStreamId || resumedStreamIds.has(pendingStreamId)) {
      return;
    }
    if (isChatRunning) {
      resumedStreamIds.add(pendingStreamId);
      return;
    }
    if (isLoadingHistory) return;
    resumedStreamIds.add(pendingStreamId);
    chat.resumeStream().catch((err: unknown) => {
      console.warn("[assistant-ui] resumable: resume failed", err);
      try {
        onResumeErrorRef.current?.(err);
      } catch (callbackError) {
        console.error(
          "[assistant-ui] resumable: onResumeError callback failed",
          callbackError,
        );
      } finally {
        if (resumableStorage?.getStreamId(id) === pendingStreamId) {
          resumableStorage.clear(id);
        }
      }
    });
  }, [
    chat,
    id,
    isChatRunning,
    isLoadingHistory,
    pendingStreamId,
    resumableStorage,
    resumedStreamIds,
  ]);

  return runtime;
};

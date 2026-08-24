"use client";

import { useChat, type Chat, type UIMessage } from "@ai-sdk/react";
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
  useSyncExternalStore,
} from "react";
import { useResourceCleanup } from "./useResourceCleanup";
import { DynamicChatTransport } from "./DynamicChatTransport";
import { getResumableAdapter } from "./getResumableAdapter";

export type ChatThreadOptions<UI_MESSAGE extends UIMessage = UIMessage> =
  ChatInit<UI_MESSAGE> &
    ExternalStoreSharedOptions & {
      throttle?: number | undefined;
      adapters?: AISDKRuntimeAdapter["adapters"] | undefined;
      toCreateMessage?: CustomToCreateMessageFunction;
      onResume?: AISDKRuntimeAdapter["onResume"];
      onResumeToolCall?: AISDKRuntimeAdapter["onResumeToolCall"];
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
   * An externally owned chat instance. State lives on the instance, so it
   * survives the hosting resource unmounting; construction options are read
   * from the instance.
   */
  chat?: Chat<UI_MESSAGE> | undefined;
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
    onResumeError,
    joinStrategy,
    messageRepository,
    unstable_onBranchChange,
    chatInit,
  };
};

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
    stopOnClientDestroy = false,
    chat: externalChat,
  } = env;

  const defaultTransport = useMemo(() => new AssistantChatTransport(), []);
  const transport = transportOptions ?? defaultTransport;
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
        ? transport.getCurrentTransport(id)
        : transport,
    [id, transport],
  );
  const sourceTransport = useSyncExternalStore(
    subscribeToTransport,
    getSourceTransport,
    getSourceTransport,
  );

  const chat = useChat({
    ...chatOptions,
    id,
    transport,
    ...(throttle !== undefined && { throttle }),
    ...(externalChat !== undefined && { chat: externalChat }),
  });

  useResourceCleanup(stopOnClientDestroy, () => {
    void chat.stop().catch(() => {});
  });

  const runtime = useAISDKRuntime(chat, {
    adapters,
    ...pickExternalStoreSharedOptions(options ?? {}),
    ...(toCreateMessage && { toCreateMessage }),
    ...(onResume && { onResume }),
    ...(onResumeToolCall && { onResumeToolCall }),
    ...(joinStrategy && { joinStrategy }),
    ...(messageRepository && { messageRepository }),
    ...(unstable_onBranchChange && { unstable_onBranchChange }),
  });

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
  }, [id, transport, transportContextOwner]);

  if (
    !(transport instanceof DynamicChatTransport) &&
    sourceTransport instanceof AssistantChatTransport
  ) {
    sourceTransport.setRuntime(runtime);
    sourceTransport.__internal_setGetThreadListItem(getCurrentThreadListItem);
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

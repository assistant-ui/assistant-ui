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
import type { ChatInit, ChatTransport } from "ai";
import {
  AssistantChatTransport,
  type InitializableThreadListItem,
} from "../transport/AssistantChatTransport";
import type {
  AssistantChatResumableOptions,
  ResumableClientStorage,
} from "../transport/resumable";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { useResourceCleanup } from "./useResourceCleanup";

export type ChatThreadOptions<UI_MESSAGE extends UIMessage = UIMessage> =
  ChatInit<UI_MESSAGE> &
    ExternalStoreSharedOptions & {
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

const useDynamicChatTransport = <UI_MESSAGE extends UIMessage = UIMessage>(
  transport: ChatTransport<UI_MESSAGE>,
): ChatTransport<UI_MESSAGE> => {
  const transportRef = useRef<ChatTransport<UI_MESSAGE>>(transport);
  useEffect(() => {
    transportRef.current = transport;
  });
  const dynamicTransport = useMemo(
    () =>
      new Proxy(transportRef.current, {
        get(_, prop) {
          const res =
            transportRef.current[prop as keyof ChatTransport<UI_MESSAGE>];
          return typeof res === "function"
            ? res.bind(transportRef.current)
            : res;
        },
      }),
    [],
  );
  return dynamicTransport;
};

const getResumableAdapter = <UI_MESSAGE extends UIMessage>(
  transport: ChatTransport<UI_MESSAGE>,
): AssistantChatResumableOptions | undefined => {
  if (transport instanceof AssistantChatTransport) {
    return transport.getResumableAdapter();
  }
  const candidate = (transport as { getResumableAdapter?: () => unknown })
    .getResumableAdapter;
  if (typeof candidate !== "function") return undefined;
  return candidate.call(transport) as AssistantChatResumableOptions | undefined;
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
    toCreateMessage,
    isDisabled: _isDisabled,
    isSendDisabled: _isSendDisabled,
    unstable_capabilities: _unstable_capabilities,
    suggestions: _suggestions,
    onResume,
    onResumeToolCall,
    onResumeError,
    joinStrategy,
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
    toCreateMessage,
    onResume,
    onResumeToolCall,
    onResumeError,
    joinStrategy,
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
    toCreateMessage,
    onResume,
    onResumeToolCall,
    onResumeError,
    joinStrategy,
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
  const sourceTransport = transportOptions ?? defaultTransport;
  const transport = useDynamicChatTransport(sourceTransport);

  const chat = useChat({
    ...chatOptions,
    id,
    transport,
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
  });

  if (sourceTransport instanceof AssistantChatTransport) {
    sourceTransport.setRuntime(runtime);
    sourceTransport.__internal_setGetThreadListItem(getThreadListItem);
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

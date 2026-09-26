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
  useState,
  useSyncExternalStore,
} from "react";
import { useResourceCleanup } from "./useResourceCleanup";

export type ChatThreadOptions<UI_MESSAGE extends UIMessage = UIMessage> =
  ChatInit<UI_MESSAGE> &
    ExternalStoreSharedOptions & {
      throttle?: number | undefined;
      adapters?: AISDKRuntimeAdapter["adapters"] | undefined;
      toCreateMessage?: CustomToCreateMessageFunction;
      onResume?: AISDKRuntimeAdapter["onResume"];
      canResume?: AISDKRuntimeAdapter["canResume"];
      onResumeToolCall?: AISDKRuntimeAdapter["onResumeToolCall"];
      onRespondToToolApproval?: AISDKRuntimeAdapter["onRespondToToolApproval"];
      /**
       * Called when a resumable stream reconnect fails. Use this to
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
    throttle,
    toCreateMessage,
    isDisabled: _isDisabled,
    isSendDisabled: _isSendDisabled,
    unstable_capabilities: _unstable_capabilities,
    suggestions: _suggestions,
    onResume,
    canResume,
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
    canResume,
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
    canResume,
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

  // Wiring below is per thread and mutated on the instance, so a transport
  // shared across simultaneously mounted threads is last-writer-wins. A
  // caller-owned chat is already bound to its own clone, so cloning again
  // here would wire a copy the chat never sends through.
  const sourceTransport = useMemo(
    () =>
      transportOptions === undefined
        ? new AssistantChatTransport()
        : externalChat === undefined &&
            transportOptions instanceof AssistantChatTransport
          ? transportOptions.__internal_clone()
          : transportOptions,
    [transportOptions, externalChat],
  );
  const transport = useDynamicChatTransport(sourceTransport);

  const latestChatOptionsRef = useRef(chatOptions);
  useEffect(() => {
    latestChatOptionsRef.current = chatOptions;
  });
  // `useChat` stops a chat it constructs whenever it unmounts, and a
  // resource's soft unmount runs that cleanup, so the thread owns its chat.
  const [ownedChat] = useState(
    () =>
      externalChat ??
      createChat({ ...chatOptions, id, transport }, latestChatOptionsRef),
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
  const resumeStream = useCallback(async () => {
    const streamId = resumableStorage?.getStreamId(id);
    if (!streamId) return;
    resumedStreamIds.add(streamId);
    try {
      const activeChat = externalChat ?? ownedChat;
      activeChat.clearError();
      await chat.resumeStream();
      // The SDK reports reconnect errors on Chat.error without rejecting.
      const error = activeChat.error;
      if (error) throw error;
    } catch (error) {
      try {
        onResumeErrorRef.current?.(error);
      } catch (callbackError) {
        console.error(
          "[assistant-ui] resumable: onResumeError callback failed",
          callbackError,
        );
      }
      throw error;
    }
  }, [chat, externalChat, id, ownedChat, resumableStorage, resumedStreamIds]);

  const handleBranchChange = useCallback<
    NonNullable<AISDKRuntimeAdapter["unstable_onBranchChange"]>
  >(
    (event) => {
      resumableStorage?.clear(id);
      unstable_onBranchChange?.(event);
    },
    [id, resumableStorage, unstable_onBranchChange],
  );

  const runtime = useAISDKRuntime(chat, {
    adapters,
    ...pickExternalStoreSharedOptions(options ?? {}),
    ...(toCreateMessage && { toCreateMessage }),
    ...(onResume
      ? { onResume }
      : resumableStorage
        ? { onResume: resumeStream }
        : {}),
    // A stored stream ID does not prove a replay will keep the original
    // assistant message ID. Some AI SDK streams omit start.messageId, in which
    // case resumeStream appends a second message after the stopped partial one.
    // Only the host can opt in when it knows its stream preserves that ID.
    canResume: onResume
      ? !!canResume
      : !!canResume && !!pendingStreamId && !isChatRunning,
    ...(onResumeToolCall && { onResumeToolCall }),
    ...(onRespondToToolApproval && { onRespondToToolApproval }),
    ...(joinStrategy && { joinStrategy }),
    ...(messageRepository && { messageRepository }),
    ...(messageRepositoryInstance && {
      unstable_messageRepositoryInstance: messageRepositoryInstance,
    }),
    ...((resumableStorage || unstable_onBranchChange) && {
      unstable_onBranchChange: handleBranchChange,
    }),
  });

  // Wire in render, not an effect: a send from a descendant's mount effect
  // runs before this hook's effect would (effects fire child-first), and must
  // see a wired transport. The clone is per thread, so a discarded render's
  // wiring is discarded with it and the committed render re-wires the same
  // instance.
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

  useEffect(() => {
    if (!pendingStreamId || resumedStreamIds.has(pendingStreamId)) {
      return;
    }
    if (isChatRunning) {
      resumedStreamIds.add(pendingStreamId);
      return;
    }
    if (isLoadingHistory) return;
    resumeStream().catch((err: unknown) => {
      console.warn("[assistant-ui] resumable: resume failed", err);
    });
  }, [
    isChatRunning,
    isLoadingHistory,
    pendingStreamId,
    resumeStream,
    resumedStreamIds,
  ]);

  return runtime;
};

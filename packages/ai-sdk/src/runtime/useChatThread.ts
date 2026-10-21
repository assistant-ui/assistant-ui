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
import {
  DynamicChatTransport,
  getResumedStreamIds,
} from "./DynamicChatTransport";
import type { ResumableClientStorage } from "../transport/resumable";
import { getResumableAdapter } from "./getResumableAdapter";
import { useDynamicChatTransport } from "./useDynamicChatTransport";

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
       * retry. With `canResume: true`, transient errors keep the stream id for
       * manual retry. Otherwise, a failed reconnect clears the matching id.
       * A 204 or 404 from the resume endpoint always clears the matching id.
       */
      onResumeError?: ((error: unknown) => void) | undefined;
      joinStrategy?: AISDKRuntimeAdapter["joinStrategy"];
      messageRepository?: AISDKRuntimeAdapter<UI_MESSAGE>["messageRepository"];
      /** @deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release. */
      unstable_onBranchChange?: AISDKRuntimeAdapter["unstable_onBranchChange"];
      /** @deprecated Experimental since 2026-10-15. Not scheduled for removal; the API may change in any release. */
      unstable_enableMessageQueue?: AISDKRuntimeAdapter["unstable_enableMessageQueue"];
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
    unstable_enableMessageQueue,
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
    unstable_enableMessageQueue,
    chatInit,
  };
};

type ChatCallbacks<UI_MESSAGE extends UIMessage> = Pick<
  ChatInit<UI_MESSAGE>,
  "onToolCall" | "onData" | "onFinish" | "onError" | "sendAutomaticallyWhen"
> & {
  canResume?: boolean | undefined;
  resumableStorage?: ResumableClientStorage | undefined;
};

const requestsByChat = new WeakMap<object, symbol>();

/**
 * Constructs a `Chat` whose callbacks read the latest options through
 * `callbacksRef`, the forwarding `useChat` applies only to a chat it
 * constructs itself.
 */
export const createChat = <UI_MESSAGE extends UIMessage>(
  init: ChatInit<UI_MESSAGE>,
  callbacksRef: { readonly current: ChatCallbacks<UI_MESSAGE> | undefined },
): Chat<UI_MESSAGE> => {
  const transport = init.transport;
  const chat = new Chat<UI_MESSAGE>({
    ...init,
    ...(transport && {
      transport: {
        get resumeStreamIsReplay() {
          return transport.resumeStreamIsReplay ?? false;
        },
        sendMessages: (options) => {
          requestsByChat.set(chat, Symbol());
          // A new send or regeneration changes the replay target even when
          // the request fails before returning a replacement checkpoint.
          if (callbacksRef.current?.canResume) {
            const storage =
              callbacksRef.current.resumableStorage ??
              getResumableAdapter(transport)?.storage;
            storage?.clear(options.chatId);
          }
          return transport.sendMessages(options);
        },
        reconnectToStream: (options) => {
          requestsByChat.set(chat, Symbol());
          return transport.reconnectToStream(options);
        },
      },
    }),
    onToolCall: (arg) => callbacksRef.current?.onToolCall?.(arg),
    onData: (arg) => callbacksRef.current?.onData?.(arg),
    onFinish: (arg) => callbacksRef.current?.onFinish?.(arg),
    onError: (arg) => callbacksRef.current?.onError?.(arg),
    sendAutomaticallyWhen: (arg) =>
      callbacksRef.current?.sendAutomaticallyWhen?.(arg) ?? false,
  });
  return chat;
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
    canResume,
    onResumeToolCall,
    onRespondToToolApproval,
    onResumeError,
    joinStrategy,
    messageRepository,
    unstable_onBranchChange,
    unstable_enableMessageQueue,
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
  const resumableStorage = useMemo(
    () =>
      transport instanceof DynamicChatTransport
        ? transport.getCurrentResumableStorage()
        : getResumableAdapter(transport)?.storage,
    [transport],
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

  const latestChatOptionsRef = useRef({
    ...chatOptions,
    canResume,
    resumableStorage,
  });
  useEffect(() => {
    latestChatOptionsRef.current = {
      ...chatOptions,
      canResume,
      resumableStorage,
    };
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

  const staticResumedStreamIds = useMemo(
    () => getResumedStreamIds(resumableStorage),
    [resumableStorage],
  );
  const onResumeErrorRef = useRef(onResumeError);
  useEffect(() => {
    onResumeErrorRef.current = onResumeError;
  });
  const resumeChatStream = chat.resumeStream;
  const resumeStream = useCallback(async () => {
    const resumedStreamIds =
      transport instanceof DynamicChatTransport
        ? transport.getResumedStreamIds()
        : staticResumedStreamIds;
    const streamId = resumableStorage?.getStreamId(id);
    if (!streamId) return;
    resumedStreamIds.add(streamId);
    try {
      const activeChat = externalChat ?? ownedChat;
      activeChat.clearError();
      const pending = resumeChatStream();
      const request = requestsByChat.get(activeChat);
      await pending;
      // Chat.error is shared with sends and resumes that can start before
      // this promise settles, including inside the caller's onFinish.
      if (requestsByChat.get(activeChat) === request && activeChat.error) {
        throw activeChat.error;
      }
    } catch (error) {
      try {
        onResumeErrorRef.current?.(error);
      } catch (callbackError) {
        console.error(
          "[assistant-ui] resumable: onResumeError callback failed",
          callbackError,
        );
      } finally {
        if (!canResume && resumableStorage?.getStreamId(id) === streamId) {
          resumableStorage.clear(id);
        }
      }
      throw error;
    }
  }, [
    canResume,
    externalChat,
    id,
    ownedChat,
    resumeChatStream,
    resumableStorage,
    staticResumedStreamIds,
    transport,
  ]);

  const handleBranchChange = useCallback<
    NonNullable<AISDKRuntimeAdapter["unstable_onBranchChange"]>
  >(
    (event) => {
      if (canResume) resumableStorage?.clear(id);
      unstable_onBranchChange?.(event);
    },
    [canResume, id, resumableStorage, unstable_onBranchChange],
  );

  const runtime = useAISDKRuntime(chat, {
    adapters: {
      ...adapters,
      threadList: { threadId: id, ...adapters?.threadList },
    },
    ...pickExternalStoreSharedOptions(options ?? {}),
    ...(toCreateMessage && { toCreateMessage }),
    ...(onResume
      ? { onResume }
      : canResume && resumableStorage
        ? { onResume: resumeStream }
        : {}),
    // AI SDK 7 starts resume-stream with fresh message state (chat.ts), so the
    // host must replay the full message with its original start.messageId.
    // Without that ID the replay appends a second message. A stored stream ID
    // alone cannot establish this contract; only the host can opt in.
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
    // The chat outlives this runtime when a host mounts only the visible
    // thread, so a host approval answer is kept with it. This is the Chat
    // instance, not the useChat helpers, which are re-minted every render and
    // would be a dead WeakMap key by the next one.
    unstable_hostApprovalOwner: externalChat ?? ownedChat,
    ...(((canResume && resumableStorage) || unstable_onBranchChange) && {
      unstable_onBranchChange: handleBranchChange,
    }),
    ...(unstable_enableMessageQueue && { unstable_enableMessageQueue }),
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

  useEffect(() => {
    const resumedStreamIds =
      transport instanceof DynamicChatTransport
        ? transport.getResumedStreamIds()
        : staticResumedStreamIds;
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
    staticResumedStreamIds,
    transport,
  ]);

  return runtime;
};

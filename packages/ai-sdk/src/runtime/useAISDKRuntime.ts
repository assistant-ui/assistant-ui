"use client";

import {
  useCallback,
  useEffect,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  UIMessage,
  useChat,
  CreateUIMessage,
  UseChatHelpers,
} from "@ai-sdk/react";
import { isToolUIPart, generateId, getToolName } from "ai";
import {
  useExternalStoreRuntime,
  useRuntimeAdapters,
  type JoinStrategy,
} from "@assistant-ui/core/react";
import { useReplaySafeEffect } from "@assistant-ui/store/internal";
import type {
  SuggestionAdapter,
  ThreadSuggestion,
  ToolExecutionStatus,
} from "@assistant-ui/core";
import type {
  ExternalStoreAdapter,
  ExternalStoreSharedOptions,
  ThreadHistoryAdapter,
  AssistantRuntime,
  ThreadMessage,
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
  AppendMessage,
  RunConfig,
  McpAppMetadata,
  RespondToToolApprovalOptions,
  Unstable_ToolInteractionLog,
} from "@assistant-ui/core";
import {
  getExternalStoreMessages,
  pickExternalStoreSharedOptions,
} from "@assistant-ui/core";
import {
  appendToolInteraction,
  consumeSuggestionResult,
  MessageRepository,
} from "@assistant-ui/core/internal";
import type { ReadonlyJSONObject } from "assistant-stream/utils";
import type { AssistantError } from "@assistant-ui/core";
import { sliceMessagesUntil } from "../utils/sliceMessagesUntil";
import { toCreateMessage } from "../converters/toCreateMessage";
import { vercelAttachmentAdapter } from "../adapters/vercelAttachmentAdapter";
import { getVercelAIMessages } from "../utils/getVercelAIMessages";
import {
  AISDKMessageConverter,
  type AISDKMessageConverterMetadata,
} from "../converters/convertMessage";
import { wrapModelContentEnvelope } from "assistant-stream/internal";
import {
  type AISDKStorageFormat,
  aiSDKV6FormatAdapter,
} from "../adapters/aiSDKFormatAdapter";
import {
  useExternalHistory,
  toExportedMessageRepository,
} from "./useExternalHistory";
import { useStreamingTiming } from "./useStreamingTiming";
import { useMessageQueue } from "./useMessageQueue";
import { aiSDKExtras } from "../aiSDKExtras";

export type CustomToCreateMessageFunction = <
  UI_MESSAGE extends UIMessage = UIMessage,
>(
  message: AppendMessage,
) => CreateUIMessage<UI_MESSAGE>;

const toUIMessage = <UI_MESSAGE extends UIMessage>(
  createMessage: CreateUIMessage<UI_MESSAGE>,
  fallbackRole: UI_MESSAGE["role"],
): UI_MESSAGE =>
  ({
    ...createMessage,
    id: createMessage.id ?? generateId(),
    role: createMessage.role ?? fallbackRole,
  }) as UI_MESSAGE;

const toVoiceTranscriptUIMessage = <UI_MESSAGE extends UIMessage>(
  message: ThreadMessage,
): UI_MESSAGE =>
  ({
    id: message.id,
    role: message.role,
    parts: message.content
      .filter((part) => part.type === "text")
      .map((part) => ({ type: "text", text: part.text })),
    metadata: {
      ...(message.metadata.modality && { modality: message.metadata.modality }),
      ...(Object.keys(message.metadata.custom).length > 0 && {
        custom: message.metadata.custom,
      }),
    },
  }) as UI_MESSAGE;

export type AISDKRuntimeAdapter<UI_MESSAGE extends UIMessage = UIMessage> =
  ExternalStoreSharedOptions & {
    adapters?:
      | (NonNullable<ExternalStoreAdapter["adapters"]> & {
          history?: ThreadHistoryAdapter | undefined;
          suggestion?: SuggestionAdapter | undefined;
        })
      | undefined;
    toCreateMessage?: CustomToCreateMessageFunction;
    unstable_messageRepositoryInstance?: MessageRepository | undefined;
    /**
     * The object a host answer belongs to, normally the `Chat` the runtime
     * renders. A host answer never reaches the `useChat` messages, so without
     * an owner it lives only as long as this runtime. With an owner, it
     * survives runtime remounts over the same chat.
     */
    unstable_hostApprovalOwner?: object | undefined;
    /**
     * Whether to automatically cancel pending interactive tool calls when the user sends a new message.
     *
     * When enabled (default), the pending tool calls will be marked as failed with an error message
     * indicating the user cancelled the tool call by sending a new message.
     *
     * @default true
     */
    cancelPendingToolCallsOnSend?: boolean | undefined;
    /**
     * Opt in to message queuing: a message sent during a run is held in
     * `composer.queue` and sent once the run settles, one request at a time.
     * Steering stops the running response and sends the message once the
     * stopped request has settled.
     */
    unstable_enableMessageQueue?: boolean | undefined;
    /**
     * Called when `runtime.thread.resumeRun(config)` is invoked.
     *
     * When omitted, `resumeRun` throws `"Runtime does not support resuming runs."`.
     * Provide this to bridge resume invocations into a custom replay channel
     * (for example, an SSE reconnect endpoint keyed by turn id).
     */
    onResume?: ExternalStoreAdapter["onResume"];
    /**
     * Called when `runtime.thread.resumeToolCall(options)` is invoked for a tool call the in-process tracker does not own.
     *
     * When omitted, `resumeToolCall` throws `"Tool call ${toolCallId} is not waiting for resume."`.
     * Provide this to bridge resume-tool-call invocations into a custom handler.
     */
    onResumeToolCall?: ExternalStoreAdapter["onResumeToolCall"];
    /**
     * Answers tool approval requests through a host-owned channel instead of the AI SDK's `addToolApprovalResponse`.
     *
     * Called for every approval request in the thread with the complete response, including option and free-form answers. Hand requests the host does not own to `respondViaAISDK`, which is what runs when this option is omitted. The answer applies to the approval when the handler starts and is removed if it throws. It is never written into the `useChat` messages, so `sendAutomaticallyWhen` cannot forward it. With a history adapter, the answer is stored with its message once the handler resolves and returns on reload. With `unstable_hostApprovalOwner`, in-memory answers survive runtime remounts over the same chat; without an owner or history adapter, they last only as long as the runtime. Bring the resumed run back into the chat, for example with `resumeStream`, and have the endpoint refuse a second resume.
     *
     * While a handler is set, an approval's `display`, `allowFreeform`, `dismissible` and `options` reach the renderer, because the handler can receive answers the AI SDK cannot carry. A stream declares them through the `approvalDescriptor` of its `tool-approval-request` chunk, the one approval field the AI SDK keeps opaque; the converter reads the request and answer fields from that descriptor when the approval itself lacks them.
     */
    onRespondToToolApproval?:
      | ((
          response: RespondToToolApprovalOptions,
          context: {
            toolCallId: string;
            toolName: string;
            /** Sends this response through the AI SDK's `addToolApprovalResponse`, which carries only `approved` and `reason`. */
            respondViaAISDK: () => Promise<void>;
          },
        ) => Promise<void> | void)
      | undefined;
    /**
     * How consecutive assistant messages are rendered.
     *
     * `"concat-content"` (the default) merges them into a single thread message.
     * `"none"` keeps each assistant message as its own thread message, which is
     * useful when a backend persists proactive or consecutive assistant messages
     * as separate entries.
     */
    joinStrategy?: JoinStrategy | undefined;
    /**
     * A branch-aware AI SDK message tree seeded once when `useChat` is empty.
     * After that seed, live updates come only from `useChat`. A later empty
     * chat or a new object identity does not reload the tree.
     */
    messageRepository?: MessageFormatRepository<UI_MESSAGE>;
    /**
     * Called after an explicit `switchToBranch` (for example a BranchPicker
     * click). Complements `setMessages` and does not enable switching by itself.
     *
     * @deprecated This API is still under active development and might change without notice.
     */
    unstable_onBranchChange?: ExternalStoreAdapter["unstable_onBranchChange"];
  };

const EMPTY_SUGGESTIONS: readonly ThreadSuggestion[] = [];

const useGeneratedSuggestions = (
  suggestionAdapter: SuggestionAdapter | undefined,
  messages: readonly ThreadMessage[],
  isRunning: boolean,
): readonly ThreadSuggestion[] => {
  const [suggestions, setSuggestions] =
    useState<readonly ThreadSuggestion[]>(EMPTY_SUGGESTIONS);
  const controllerRef = useRef<AbortController | null>(null);
  const wasRunningRef = useRef(false);
  const messagesRef = useRef(messages);
  useInsertionEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const adapterKey = suggestionAdapter?.key;
  const adapterRef = useRef(suggestionAdapter);
  const lastAdapterKeyRef = useRef(adapterKey);
  const adapterReplacedRef = useRef(false);
  useInsertionEffect(() => {
    const previousAdapter = adapterRef.current;
    adapterRef.current = suggestionAdapter;
    const adapterReplaced =
      previousAdapter !== undefined &&
      suggestionAdapter !== undefined &&
      lastAdapterKeyRef.current !== adapterKey;
    adapterReplacedRef.current ||= adapterReplaced;
    if (suggestionAdapter === undefined || adapterReplaced) {
      controllerRef.current?.abort();
    }
    lastAdapterKeyRef.current = adapterKey;
  }, [adapterKey, suggestionAdapter]);
  const hasAdapter = suggestionAdapter !== undefined;
  const adapterPresentRef = useRef(hasAdapter);

  useEffect(() => {
    const clearSuggestions = () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
      setSuggestions((prev) => (prev.length === 0 ? prev : EMPTY_SUGGESTIONS));
    };

    const adapter = adapterRef.current;
    const adapterRestored = hasAdapter && !adapterPresentRef.current;
    adapterPresentRef.current = hasAdapter;
    const adapterReplaced = adapterReplacedRef.current;
    adapterReplacedRef.current = false;
    if (!adapter) {
      clearSuggestions();
      wasRunningRef.current = isRunning;
      return;
    }

    if (adapterReplaced) clearSuggestions();

    if (isRunning) {
      if (!wasRunningRef.current) {
        clearSuggestions();
      }
      wasRunningRef.current = true;
      return;
    }

    if (!wasRunningRef.current && !adapterReplaced && !adapterRestored) return;
    wasRunningRef.current = false;

    const currentMessages = messagesRef.current;
    const last = currentMessages.at(-1);
    if (last?.role !== "assistant") return;
    if (last.status?.type === "requires-action") return;

    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;

    void (async () => {
      try {
        const promiseOrGenerator = adapter.generate({
          messages: currentMessages,
          signal,
        });

        await consumeSuggestionResult(promiseOrGenerator, {
          signal,
          onUpdate: (nextSuggestions) => {
            if (controllerRef.current !== controller) return;
            setSuggestions(nextSuggestions);
          },
        });
      } catch {}
    })();
  }, [adapterKey, hasAdapter, isRunning]);

  useReplaySafeEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  return suggestions;
};

const NO_CANCELLED_MESSAGE_IDS: ReadonlySet<string> = new Set();

const NO_SUPERSEDED_APPROVAL_PROJECTION = Object.freeze({
  approvalIds: Object.freeze(new Set<string>()),
  statusMessageIds: Object.freeze(new Set<string>()),
});

const NO_TOOL_APPROVAL_RESPONSES: ReadonlyMap<
  string,
  RespondToToolApprovalOptions
> = new Map();

/**
 * A host answer is deliberately kept out of the `useChat` messages, so nothing
 * in the chat records it. Held in runtime state it would die with the runtime,
 * and a runtime mounted again over the same chat would show the request open
 * and take a second answer. Keyed on the chat instead, the answer lives as
 * long as the chat it belongs to, and is collected with it.
 */
type OwnedApproval = {
  response: RespondToToolApprovalOptions;
};

type ChatRuntimeState = {
  approvals: Map<string, OwnedApproval>;
  cancelledMessageIds: ReadonlySet<string>;
};

const chatRuntimeStates = new WeakMap<object, ChatRuntimeState>();

const getChatRuntimeState = (owner: object | undefined) => {
  if (owner === undefined) return undefined;
  let state = chatRuntimeStates.get(owner);
  if (state === undefined) {
    state = {
      approvals: new Map(),
      cancelledMessageIds: NO_CANCELLED_MESSAGE_IDS,
    };
    chatRuntimeStates.set(owner, state);
  }
  return state;
};

const toApprovalResponses = (
  owned: ReadonlyMap<string, OwnedApproval> | undefined,
): ReadonlyMap<string, RespondToToolApprovalOptions> =>
  owned && owned.size > 0
    ? new Map([...owned].map(([id, entry]) => [id, entry.response]))
    : NO_TOOL_APPROVAL_RESPONSES;

/**
 * The answers live on the owner, but each mounted runtime renders them from
 * its own state, so a write has to be announced: the runtime that performed it
 * may already be unmounted (a rollback resolving after a remount), and another
 * runtime may be mounted over the same owner.
 */
const chatRuntimeListeners = new WeakMap<object, Set<() => void>>();

const subscribeToChatRuntimeState = (owner: object, listener: () => void) => {
  const listeners = chatRuntimeListeners.get(owner) ?? new Set();
  chatRuntimeListeners.set(owner, listeners);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notifyChatRuntimeState = (owner: object) => {
  for (const listener of [...(chatRuntimeListeners.get(owner) ?? [])]) {
    listener();
  }
};

const getSupersededApprovalProjection = <UI_MESSAGE extends UIMessage>(
  messages: readonly UI_MESSAGE[],
  hostApprovalIds: ReadonlySet<string>,
  joinStrategy: JoinStrategy | undefined,
  isRunning: boolean,
) => {
  const approvalIds = new Set<string>();
  const statusMessageIds = new Set<string>();
  const lastIndex = messages.length - 1;
  let lastAssistant: UI_MESSAGE | undefined;
  let hasSupersededApproval = false;
  let previousWasVoice = false;

  const flush = () => {
    const hasOpenToolPart =
      lastAssistant === messages[lastIndex] &&
      lastAssistant?.parts?.some((part) => {
        if (
          typeof part?.type !== "string" ||
          !isToolUIPart(part) ||
          part.state === "output-available" ||
          part.state === "output-error" ||
          part.state === "output-denied"
        )
          return false;

        const approval = (
          part as {
            approval?: {
              resolution?: unknown;
              descriptor?: unknown;
            };
          }
        ).approval;
        const resolution =
          approval?.resolution ??
          (approval?.descriptor as { resolution?: unknown } | undefined)
            ?.resolution;
        return resolution !== "cancelled" && resolution !== "expired";
      });
    if (
      lastAssistant &&
      hasSupersededApproval &&
      !hasOpenToolPart &&
      !(isRunning && lastAssistant === messages[lastIndex])
    ) {
      statusMessageIds.add(lastAssistant.id);
    }
    lastAssistant = undefined;
    hasSupersededApproval = false;
    previousWasVoice = false;
  };

  for (let index = 0; index < messages.length; index++) {
    const message = messages[index]!;
    if (message.role !== "assistant") {
      flush();
    } else {
      const isVoice =
        (message.metadata as { modality?: unknown } | undefined)?.modality ===
        "voice";
      if (isVoice || previousWasVoice || joinStrategy === "none") flush();
      lastAssistant = message;
      previousWasVoice = isVoice;
    }

    for (const part of message.parts ?? []) {
      if (
        typeof part?.type !== "string" ||
        !isToolUIPart(part) ||
        part.state !== "approval-requested"
      )
        continue;

      const approval = part.approval;
      if (!approval) continue;

      const approvalId = approval.id;
      if (hostApprovalIds.has(approvalId)) continue;

      const resolution =
        (approval as { resolution?: unknown }).resolution ??
        (approval.descriptor as { resolution?: unknown } | null | undefined)
          ?.resolution;
      if (resolution === "cancelled" || resolution === "expired") continue;

      if (index !== lastIndex) {
        approvalIds.add(approvalId);
        if (message.role === "assistant") hasSupersededApproval = true;
      }
    }
  }
  flush();

  if (approvalIds.size === 0 && statusMessageIds.size === 0)
    return NO_SUPERSEDED_APPROVAL_PROJECTION;

  return { approvalIds, statusMessageIds };
};

const findRawToolMessageIndex = <UI_MESSAGE extends UIMessage>(
  messages: readonly UI_MESSAGE[],
  messageId: string,
  toolCallId: string,
  joinStrategy: JoinStrategy | undefined,
) => {
  const containsToolCall = (message: UI_MESSAGE) =>
    message.parts?.some(
      (part) =>
        typeof part?.type === "string" &&
        isToolUIPart(part) &&
        part.toolCallId === toolCallId,
    ) === true;

  const messageIndex = messages.findIndex(
    (message) => message.id === messageId,
  );
  if (messageIndex === -1) return -1;
  if (containsToolCall(messages[messageIndex]!)) return messageIndex;
  if (joinStrategy === "none" || messages[messageIndex]?.role !== "assistant")
    return -1;

  let start = messageIndex;
  while (start > 0 && messages[start - 1]?.role === "assistant") start--;

  let end = messageIndex;
  while (end + 1 < messages.length && messages[end + 1]?.role === "assistant")
    end++;

  for (let index = start; index <= end; index++) {
    if (containsToolCall(messages[index]!)) return index;
  }
  return -1;
};

const toChatError = (error: Error): AssistantError => {
  const code = (error as { code?: unknown }).code;
  return {
    code:
      typeof code === "string"
        ? code
        : error.name !== "Error"
          ? error.name
          : "unknown",
    message: error.message,
  };
};

export const useAISDKRuntime = <UI_MESSAGE extends UIMessage = UIMessage>(
  chatHelpers: ReturnType<typeof useChat<UI_MESSAGE>>,
  adapter: AISDKRuntimeAdapter<UI_MESSAGE> = {},
) => {
  const {
    adapters,
    toCreateMessage: customToCreateMessage,
    cancelPendingToolCallsOnSend = true,
    onResume,
    onResumeToolCall,
    onRespondToToolApproval: customOnRespondToToolApproval,
    joinStrategy,
    messageRepository,
    unstable_onBranchChange,
    unstable_enableMessageQueue,
  } = adapter;
  const suggestionAdapter = adapters?.suggestion;
  const contextAdapters = useRuntimeAdapters();
  const [queueError, setQueueError] = useState<Error>();
  const runtimeError = unstable_enableMessageQueue
    ? (queueError ?? chatHelpers.error)
    : chatHelpers.error;
  const [toolStatuses, setToolStatuses] = useState<
    Record<string, ToolExecutionStatus>
  >({});
  const [cancelledMessages, setCancelledMessages] = useState<{
    chatId: string;
    ids: ReadonlySet<string>;
  } | null>(null);
  // Set by hosts that own the chat across runtime lifetimes, so a host answer
  // outlives a remount over that same chat.
  const approvalOwner = adapter.unstable_hostApprovalOwner;
  const chatRuntimeState = getChatRuntimeState(approvalOwner);
  const ownedApprovals = chatRuntimeState?.approvals;
  const ownedCancelledMessageIds = useSyncExternalStore(
    useCallback(
      (listener) =>
        approvalOwner
          ? subscribeToChatRuntimeState(approvalOwner, listener)
          : () => {},
      [approvalOwner],
    ),
    useCallback(
      () => chatRuntimeState?.cancelledMessageIds ?? NO_CANCELLED_MESSAGE_IDS,
      [chatRuntimeState],
    ),
    () => NO_CANCELLED_MESSAGE_IDS,
  );
  const [toolApprovalResponses, setToolApprovalResponses] = useState<
    ReadonlyMap<string, RespondToToolApprovalOptions>
  >(() => toApprovalResponses(ownedApprovals));
  const [toolArtifactEpoch, setToolArtifactEpoch] = useState(0);
  const [toolInteractionEpoch, setToolInteractionEpoch] = useState(0);
  const toolApprovalResponsesRef = useRef(
    new Map(toApprovalResponses(ownedApprovals)),
  );
  const ownedApprovalIdsRef = useRef(new Set(ownedApprovals?.keys()));
  const hostApprovalIdsRef = useRef(new Set<string>(ownedApprovals?.keys()));

  // The owner's record is shared, so this runtime re-reads it whenever it is
  // written rather than only at mount: the write may come from a runtime that
  // has since unmounted, or from another runtime mounted over the same owner.
  useEffect(() => {
    if (!approvalOwner || !ownedApprovals) return undefined;
    const sync = () => {
      for (const id of ownedApprovalIdsRef.current)
        toolApprovalResponsesRef.current.delete(id);
      for (const [id, entry] of ownedApprovals)
        toolApprovalResponsesRef.current.set(id, entry.response);
      ownedApprovalIdsRef.current = new Set(ownedApprovals.keys());
      hostApprovalIdsRef.current = new Set(
        toolApprovalResponsesRef.current.keys(),
      );
      setToolApprovalResponses((prev) => {
        const next = new Map(toolApprovalResponsesRef.current);
        const unchanged =
          prev.size === next.size &&
          [...next].every(([id, response]) => prev.get(id) === response);
        return unchanged ? prev : next;
      });
    };
    const unsubscribe = subscribeToChatRuntimeState(approvalOwner, sync);
    // The state was seeded during render, so a write landing between then and
    // this subscription would otherwise never be seen.
    sync();
    return unsubscribe;
  }, [approvalOwner, ownedApprovals]);

  // A runtime kept mounted across a change of owner must not carry the
  // previous chat's answers: a reused approval id would render as already
  // answered and reject a genuine response.
  const lastApprovalOwnerRef = useRef(approvalOwner);
  if (lastApprovalOwnerRef.current !== approvalOwner) {
    lastApprovalOwnerRef.current = approvalOwner;
    hostApprovalIdsRef.current = new Set<string>(ownedApprovals?.keys());
    toolApprovalResponsesRef.current = new Map(
      toApprovalResponses(ownedApprovals),
    );
    ownedApprovalIdsRef.current = new Set(ownedApprovals?.keys());
    setToolApprovalResponses(new Map(toolApprovalResponsesRef.current));
  }
  const toolArgsKeyOrderCacheRef = useRef<Map<string, Map<string, string[]>>>(
    new Map(),
  );
  const toolLastInputCacheRef = useRef<Map<string, ReadonlyJSONObject>>(
    new Map(),
  );
  const toolArgsTextCacheRef = useRef<
    NonNullable<AISDKMessageConverterMetadata["toolArgsTextCache"]>
  >(new WeakMap());
  const mcpAppMetadataCacheRef = useRef<Map<string, McpAppMetadata>>(new Map());
  const toolArtifactsRef = useRef<Map<string, unknown>>(new Map());
  const toolInteractionsRef = useRef<Map<string, Unstable_ToolInteractionLog>>(
    new Map(),
  );
  const lastRunConfigRef = useRef<RunConfig | undefined>(undefined);
  const steeredAnswerIdRef = useRef<string | undefined>(undefined);
  const markToolArtifactsChanged = useCallback(() => {
    setToolArtifactEpoch((epoch) => epoch + 1);
  }, []);
  const markToolInteractionsChanged = useCallback(() => {
    setToolInteractionEpoch((epoch) => epoch + 1);
  }, []);

  const hasExecutingTools = Object.values(toolStatuses).some(
    (s) => s?.type === "executing",
  );
  const providerIsRunning =
    chatHelpers.status === "submitted" || chatHelpers.status === "streaming";
  const isRunning = providerIsRunning || hasExecutingTools;
  const wasProviderRunningRef = useRef(providerIsRunning);

  const messageTiming = useStreamingTiming(chatHelpers.messages, isRunning);

  // Flag the streaming message optimistic: its id can be swapped for a server
  // id mid-run, and the repository then drops the orphaned pre-swap id (#4037).
  const lastMessage = chatHelpers.messages.at(-1);
  const optimisticMessageId =
    isRunning && lastMessage?.role === "assistant" ? lastMessage.id : undefined;

  const cancelledMessageIds = chatRuntimeState
    ? ownedCancelledMessageIds
    : cancelledMessages?.chatId === chatHelpers.id
      ? cancelledMessages.ids
      : NO_CANCELLED_MESSAGE_IDS;
  const supportsRichToolApprovalResponses =
    customOnRespondToToolApproval != null;
  const supersededApprovalProjectionRef = useRef(
    NO_SUPERSEDED_APPROVAL_PROJECTION,
  );
  const supersededApprovalProjection = useMemo(
    () => {
      const projection = getSupersededApprovalProjection(
        chatHelpers.messages,
        hostApprovalIdsRef.current,
        joinStrategy,
        isRunning,
      );
      const previous = supersededApprovalProjectionRef.current;
      if (
        projection.approvalIds.size === previous.approvalIds.size &&
        projection.statusMessageIds.size === previous.statusMessageIds.size &&
        [...projection.approvalIds].every((id) =>
          previous.approvalIds.has(id),
        ) &&
        [...projection.statusMessageIds].every((id) =>
          previous.statusMessageIds.has(id),
        )
      )
        return previous;

      supersededApprovalProjectionRef.current = projection;
      return projection;
    },
    // oxlint-disable-next-line react/exhaustive-deps -- hostApprovalIdsRef changes alongside toolApprovalResponses, which invalidates the projection
    [chatHelpers.messages, joinStrategy, isRunning, toolApprovalResponses],
  );

  const toThreadMessages = useCallback(
    (sourceMessages: UI_MESSAGE[]) => {
      const metadata: AISDKMessageConverterMetadata = {
        supportsRichToolApprovalResponses,
        toolArtifacts: toolArtifactsRef.current,
        toolInteractions: toolInteractionsRef.current,
        toolApprovalResponses: toolApprovalResponsesRef.current,
      };
      return AISDKMessageConverter.toThreadMessages(
        sourceMessages,
        false,
        metadata,
      );
    },
    [supportsRichToolApprovalResponses],
  );

  const retractCancellation = useCallback(
    (chatId: string, messageId: string) => {
      if (chatRuntimeState !== undefined && approvalOwner !== undefined) {
        if (!chatRuntimeState.cancelledMessageIds.has(messageId)) return;
        const ids = new Set(chatRuntimeState.cancelledMessageIds);
        ids.delete(messageId);
        chatRuntimeState.cancelledMessageIds = ids;
        notifyChatRuntimeState(approvalOwner);
        return;
      }
      setCancelledMessages((prev) => {
        if (prev?.chatId !== chatId || !prev.ids.has(messageId)) return prev;
        const ids = new Set(prev.ids);
        ids.delete(messageId);
        return { chatId, ids };
      });
    },
    [approvalOwner, chatRuntimeState],
  );

  // A provider run that resumes the stopped response retracts its cancellation;
  // a run that starts a new response leaves the stopped one marked.
  const resumedMessageId =
    providerIsRunning && lastMessage?.role === "assistant"
      ? lastMessage.id
      : undefined;

  useEffect(() => {
    const wasProviderRunning = wasProviderRunningRef.current;
    wasProviderRunningRef.current = providerIsRunning;
    if (wasProviderRunning || !resumedMessageId) return;
    retractCancellation(chatHelpers.id, resumedMessageId);
  }, [
    providerIsRunning,
    resumedMessageId,
    chatHelpers.id,
    retractCancellation,
  ]);

  const messages = AISDKMessageConverter.useThreadMessages({
    isRunning,
    messages: chatHelpers.messages,
    joinStrategy,
    metadata: useMemo<AISDKMessageConverterMetadata>(
      () => ({
        toolStatuses,
        messageTiming,
        toolArgsKeyOrderCache: toolArgsKeyOrderCacheRef.current,
        toolArgsTextCache: toolArgsTextCacheRef.current,
        toolLastInputCache: toolLastInputCacheRef.current,
        mcpAppMetadataCache: mcpAppMetadataCacheRef.current,
        toolArtifacts: toolArtifactsRef.current,
        toolInteractions: toolInteractionsRef.current,
        supportsRichToolApprovalResponses,
        cancelledToolApprovalIds: supersededApprovalProjection.approvalIds,
        cancelledStatusMessageIds:
          supersededApprovalProjection.statusMessageIds,
        ...(optimisticMessageId && { optimisticMessageId }),
        ...(chatHelpers.error && {
          error: toChatError(chatHelpers.error),
        }),
        ...(cancelledMessageIds.size > 0 && { cancelledMessageIds }),
        ...(toolApprovalResponses.size > 0 && { toolApprovalResponses }),
      }),
      [
        toolStatuses,
        messageTiming,
        optimisticMessageId,
        chatHelpers.error,
        cancelledMessageIds,
        toolApprovalResponses,
        supportsRichToolApprovalResponses,
        supersededApprovalProjection,
        toolArtifactEpoch,
        toolInteractionEpoch,
      ],
    ),
  });

  const exportedMessageRepository = useMemo(() => {
    if (!messageRepository) return undefined;
    const converted = toExportedMessageRepository(
      toThreadMessages,
      messageRepository,
    );
    return converted.messages.length > 0 ? converted : undefined;
  }, [messageRepository, toThreadMessages]);

  const generatedSuggestions = useGeneratedSuggestions(
    suggestionAdapter,
    messages,
    isRunning,
  );

  const [runtimeRef] = useState(() => ({
    get current(): AssistantRuntime {
      return runtime;
    },
  }));

  const {
    isLoading,
    deleteMessage: deleteHistoryMessage,
    persistToolInteractions,
    persistToolApprovalResponses,
  } = useExternalHistory(
    runtimeRef,
    adapters?.history ?? contextAdapters?.history,
    toThreadMessages,
    aiSDKV6FormatAdapter as MessageFormatAdapter<
      UI_MESSAGE,
      AISDKStorageFormat
    >,
    (messages) => {
      chatHelpers.setMessages(messages);
    },
    toolArtifactsRef.current,
    markToolArtifactsChanged,
    toolInteractionsRef.current,
    markToolInteractionsChanged,
    toolApprovalResponsesRef.current,
    () => {
      for (const [id, entry] of ownedApprovals ?? []) {
        toolApprovalResponsesRef.current.set(id, entry.response);
      }
      hostApprovalIdsRef.current = new Set(
        toolApprovalResponsesRef.current.keys(),
      );
      setToolApprovalResponses(new Map(toolApprovalResponsesRef.current));
    },
  );

  const {
    id: chatId,
    messages: chatMessages,
    status: chatStatus,
  } = chatHelpers;
  const extras = useMemo(
    () =>
      aiSDKExtras.provide({
        chat: chatHelpers as unknown as UseChatHelpers<UIMessage>,
        error: runtimeError,
      }),
    // oxlint-disable-next-line react/exhaustive-deps -- keyed on the chat's identity and reactive snapshots; useChat re-mints the helpers object every render while its remaining fields are instance-bound methods, and a render-stable extras identity is what lets the external-store core dedupe adapter updates
    [chatId, chatMessages, chatStatus, runtimeError],
  );

  const completePendingToolCalls = async () => {
    if (!cancelPendingToolCallsOnSend) return;

    // The runtime auto-aborts in-flight tool invocations when a new run
    // is dispatched (append() / startRun()), so this only has to mark the
    // abandoned tools cancelled in the UI message list. Every non-terminal
    // tool call qualifies wherever it sits: the run that produced it is over,
    // and a staged `startRun: false` message can sit between it and the tail.
    // Uses setMessages to avoid triggering sendAutomaticallyWhen.
    chatHelpers.setMessages((messages) => {
      let hasChanges = false;

      const next = messages.map((message) => {
        if (message.role !== "assistant") return message;

        let messageChanged = false;
        const parts = message.parts?.map((part) => {
          if (typeof part?.type !== "string" || !isToolUIPart(part))
            return part;
          if (
            part.state === "output-available" ||
            part.state === "output-error" ||
            part.state === "output-denied"
          )
            return part;

          messageChanged = true;
          const { approval: _approval, ...rest } = part;
          return {
            ...rest,
            state: "output-error" as const,
            errorText: "User cancelled tool call by sending a new message.",
          };
        });

        if (!messageChanged) return message;
        hasChanges = true;
        return { ...message, parts };
      });

      if (!hasChanges) return messages;
      return next;
    });
  };

  const respondViaAISDK = ({
    approvalId,
    approved,
    reason,
  }: RespondToToolApprovalOptions) =>
    Promise.resolve(
      chatHelpers.addToolApprovalResponse({
        id: approvalId,
        approved,
        ...(reason != null && { reason }),
        options: { metadata: lastRunConfigRef.current },
      }),
    );

  const respondViaHost = async (
    onRespond: NonNullable<AISDKRuntimeAdapter["onRespondToToolApproval"]>,
    response: RespondToToolApprovalOptions,
  ) => {
    const { approvalId } = response;
    const requested = chatHelpers.messages
      .flatMap((message) =>
        message.parts.flatMap((part) =>
          typeof part?.type === "string" && isToolUIPart(part)
            ? [{ messageId: message.id, part }]
            : [],
        ),
      )
      .find(
        ({ part }) =>
          part.state === "approval-requested" &&
          part.approval?.id === approvalId,
      );
    if (!requested || hostApprovalIdsRef.current.has(approvalId))
      throw new Error(
        `Tool approval ${approvalId} is not waiting for a response.`,
      );

    // A host answer stays out of the useChat messages, where sendAutomaticallyWhen would forward it to the chat route.
    // The owner can change while a response is in flight, and the id set is a
    // ref that is reseeded when it does. Both writes are therefore scoped to
    // the record this response started under, so a rollback never reaches a
    // different chat's state.
    const startedWith = ownedApprovals;
    const startedOwner = approvalOwner;
    const startedResponses = toolApprovalResponsesRef.current;
    // Whether this response is currently applied, tracked here rather than
    // read back from the id ref: that ref follows the chat on screen and is
    // reseeded when the owner changes, so it cannot answer for this response.
    let isApplied = false;
    const applyResponse = (applied: boolean) => {
      isApplied = applied;
      // The captured record is always corrected, so a rollback reaches the
      // chat the response belongs to even after the owner moved on.
      if (applied)
        startedWith?.set(approvalId, {
          response,
        });
      else startedWith?.delete(approvalId);

      if (startedOwner) {
        // Every runtime mounted over that owner re-reads the record, including
        // one mounted after this response started.
        notifyChatRuntimeState(startedOwner);
        return;
      }

      if (lastApprovalOwnerRef.current !== startedOwner) return;
      if (applied) hostApprovalIdsRef.current.add(approvalId);
      else hostApprovalIdsRef.current.delete(approvalId);
      if (applied) toolApprovalResponsesRef.current.set(approvalId, response);
      else toolApprovalResponsesRef.current.delete(approvalId);
      setToolApprovalResponses(new Map(toolApprovalResponsesRef.current));
    };

    applyResponse(true);
    try {
      await onRespond(response, {
        toolCallId: requested.part.toolCallId,
        toolName: getToolName(requested.part),
        respondViaAISDK: async () => {
          try {
            await respondViaAISDK(response);
          } finally {
            applyResponse(false);
          }
        },
      });
    } catch (error) {
      if (isApplied) applyResponse(false);
      throw error;
    }
    const remainsApplied =
      startedWith?.has(approvalId) ?? startedResponses.has(approvalId);
    if (isApplied && remainsApplied) {
      await persistToolApprovalResponses(requested.messageId);
    }
  };

  // A thread message can join several AI SDK messages, so a slice through it
  // has to end at the last of them rather than at the id the thread exposes.
  const lastAISDKMessageId = (threadMessageId: string | null) => {
    if (threadMessageId == null) return null;
    const threadMessage = runtimeRef.current.thread
      .getState()
      .messages.find((message) => message.id === threadMessageId);
    return (
      (threadMessage &&
        getVercelAIMessages<UI_MESSAGE>(threadMessage).at(-1)?.id) ??
      threadMessageId
    );
  };

  const cancelRun = async () => {
    const message = chatHelpers.messages.at(-1);
    const cancelledId =
      isRunning && message?.role === "assistant" ? message.id : undefined;
    if (cancelledId) {
      const liveIds = new Set(chatHelpers.messages.map((m) => m.id));
      if (chatRuntimeState !== undefined && approvalOwner !== undefined) {
        chatRuntimeState.cancelledMessageIds = new Set([
          ...[...chatRuntimeState.cancelledMessageIds].filter((id) =>
            liveIds.has(id),
          ),
          cancelledId,
        ]);
        notifyChatRuntimeState(approvalOwner);
      } else {
        setCancelledMessages((prev) => {
          const kept =
            prev?.chatId === chatHelpers.id
              ? [...prev.ids].filter((id) => liveIds.has(id))
              : [];
          return {
            chatId: chatHelpers.id,
            ids: new Set([...kept, cancelledId]),
          };
        });
      }
    }
    try {
      await chatHelpers.stop();
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        if (cancelledId) retractCancellation(chatHelpers.id, cancelledId);
        throw error;
      }
    }
  };

  const sendNew = async (message: AppendMessage) => {
    setQueueError(undefined);
    const createMessage = (
      customToCreateMessage ?? toCreateMessage
    )<UI_MESSAGE>(message);

    if (!(message.startRun ?? message.role === "user")) {
      chatHelpers.setMessages((current) => [
        ...current,
        toUIMessage<UI_MESSAGE>(createMessage, message.role),
      ]);
      return;
    }

    lastRunConfigRef.current = message.runConfig;
    await completePendingToolCalls();
    await chatHelpers.sendMessage(createMessage, {
      metadata: message.runConfig,
    });
  };

  const messageQueue = useMessageQueue({
    onError: (error) => {
      if (error?.name === "AbortError") {
        steeredAnswerIdRef.current = undefined;
        setQueueError(undefined);
      } else {
        setQueueError(error);
      }
    },
    enabled: unstable_enableMessageQueue === true,
    isRunning,
    isSendDisabled: adapter.isSendDisabled === true,
    send: (message) =>
      sendNew(message).finally(() => {
        steeredAnswerIdRef.current = undefined;
      }),
    cancel: cancelRun,
    // Stopping through the runtime also aborts client tools, but it hands an
    // unanswered message back to the composer. A request with no answer yet
    // has no tools to abort, so it stops here and the message stays put.
    interrupt: () => {
      const answer = chatHelpers.messages.at(-1);
      if (answer?.role === "user") return cancelRun();
      steeredAnswerIdRef.current = answer?.id;
      return runtimeRef.current.thread.cancelRun();
    },
  });

  const hasSeededRepositoryRef = useRef(false);
  const shouldFeedRepository =
    exportedMessageRepository != null &&
    !hasSeededRepositoryRef.current &&
    messages.length === 0;

  const runtime = useExternalStoreRuntime({
    unstable_persistsHistory: true,
    isRunning: providerIsRunning,
    ...(shouldFeedRepository
      ? { messageRepository: exportedMessageRepository }
      : { messages }),
    unstable_enableToolInvocations: true,
    setToolStatuses,
    setMessages: (messages) =>
      chatHelpers.setMessages(
        messages
          .map(getVercelAIMessages<UI_MESSAGE>)
          .filter(Boolean)
          .flat(),
      ),
    onImport: (messages) =>
      chatHelpers.setMessages(
        messages
          .map(getVercelAIMessages<UI_MESSAGE>)
          .filter(Boolean)
          .flat(),
      ),
    onVoiceTranscript: (message: ThreadMessage) =>
      chatHelpers.setMessages((current) => [
        ...current,
        toVoiceTranscriptUIMessage<UI_MESSAGE>(message),
      ]),
    onExportExternalState: (): MessageFormatRepository<UI_MESSAGE> => {
      const exported = runtimeRef.current.thread.export();

      const expandedMessages: MessageFormatItem<UI_MESSAGE>[] = [];
      const lastInnerIdMap = new Map<string, string>();

      for (const item of exported.messages) {
        const innerMessages = getExternalStoreMessages<UI_MESSAGE>(
          item.message,
        );
        let parentId =
          item.parentId != null
            ? (lastInnerIdMap.get(item.parentId) ?? item.parentId)
            : null;
        for (const innerMessage of innerMessages) {
          expandedMessages.push({ parentId, message: innerMessage });
          parentId = aiSDKV6FormatAdapter.getId(innerMessage as UIMessage);
        }
        if (innerMessages.length > 0) {
          lastInnerIdMap.set(
            item.message.id,
            aiSDKV6FormatAdapter.getId(
              innerMessages[innerMessages.length - 1]! as UIMessage,
            ),
          );
        }
      }

      const result: MessageFormatRepository<UI_MESSAGE> = {
        messages: expandedMessages,
      };

      if (exported.headId != null) {
        result.headId = lastInnerIdMap.get(exported.headId) ?? exported.headId;
      }

      return result;
    },
    onLoadExternalState: (repo: MessageFormatRepository<UI_MESSAGE>) => {
      // Convert MessageFormatRepository to ExportedMessageRepository
      const exportedRepo = toExportedMessageRepository(toThreadMessages, repo);

      // Import into the thread's MessageRepository
      runtimeRef.current.thread.import(exportedRepo);
    },
    onCancel: messageQueue.cancel,
    onNew: sendNew,
    ...(messageQueue.adapter && { queue: messageQueue.adapter }),
    onEdit: async (message) => {
      messageQueue.clear();
      const createMessage = (
        customToCreateMessage ?? toCreateMessage
      )<UI_MESSAGE>(message);

      const parentId = lastAISDKMessageId(message.parentId);
      if (!(message.startRun ?? message.role === "user")) {
        chatHelpers.setMessages((current) => [
          ...sliceMessagesUntil(current, parentId),
          toUIMessage<UI_MESSAGE>(createMessage, message.role),
        ]);
        return;
      }

      lastRunConfigRef.current = message.runConfig;
      chatHelpers.setMessages((current) =>
        sliceMessagesUntil(current, parentId),
      );
      await chatHelpers.sendMessage(createMessage, {
        metadata: message.runConfig,
      });
    },
    onDelete: async (messageId) => {
      const threadMessages = runtimeRef.current.thread.getState().messages;
      const messageIndex = threadMessages.findIndex(
        (message) => message.id === messageId,
      );
      if (messageIndex === -1) return;

      await deleteHistoryMessage(messageId);

      let removedToolArtifact = false;
      let removedToolInteractions = false;
      let removedToolApprovalResponse = false;
      let removedHostApprovalId = false;
      for (const part of threadMessages[messageIndex]!.content) {
        if (part.type === "tool-call") {
          removedToolArtifact =
            toolArtifactsRef.current.delete(part.toolCallId) ||
            removedToolArtifact;
          removedToolInteractions =
            toolInteractionsRef.current.delete(part.toolCallId) ||
            removedToolInteractions;
          if (part.approval) {
            ownedApprovals?.delete(part.approval.id);
            removedToolApprovalResponse =
              toolApprovalResponsesRef.current.delete(part.approval.id) ||
              removedToolApprovalResponse;
            removedHostApprovalId =
              hostApprovalIdsRef.current.delete(part.approval.id) ||
              removedHostApprovalId;
          }
        }
      }
      if (removedToolArtifact) markToolArtifactsChanged();
      if (removedToolInteractions) markToolInteractionsChanged();
      if (removedToolApprovalResponse || removedHostApprovalId) {
        if (approvalOwner) notifyChatRuntimeState(approvalOwner);
        setToolApprovalResponses(new Map(toolApprovalResponsesRef.current));
      }

      const deleteIds = new Set(
        getExternalStoreMessages<UI_MESSAGE>(threadMessages[messageIndex]!).map(
          (message) => message.id,
        ),
      );
      chatHelpers.setMessages((current) =>
        current.filter((message) => !deleteIds.has(message.id)),
      );
    },
    onReload: async (parentId: string | null, config) => {
      messageQueue.clear();
      lastRunConfigRef.current = config.runConfig;
      const newMessages = sliceMessagesUntil(
        chatHelpers.messages,
        lastAISDKMessageId(parentId),
      );
      // regenerate drops a trailing assistant message, so the first message of
      // the reloaded response stays for it to drop instead of the parent.
      const reloaded = chatHelpers.messages[newMessages.length];
      if (reloaded?.role === "assistant") newMessages.push(reloaded);
      chatHelpers.setMessages(newMessages);

      await chatHelpers.regenerate({ metadata: config.runConfig });
    },
    onAddToolResult: ({
      messageId,
      toolCallId,
      toolName,
      result,
      isError,
      artifact,
      modelContent,
    }) => {
      if (artifact !== undefined) {
        toolArtifactsRef.current.set(toolCallId, artifact);
        markToolArtifactsChanged();
      }

      const targetIndex = findRawToolMessageIndex(
        chatHelpers.messages,
        messageId,
        toolCallId,
        joinStrategy,
      );

      const errorText =
        typeof result === "string" ? result : JSON.stringify(result);
      const output =
        !isError && modelContent !== undefined
          ? wrapModelContentEnvelope(result, modelContent)
          : result;

      // The answer a steer stopped is not continued by sendAutomaticallyWhen
      // once the tools the steer aborted report back.
      if (
        targetIndex >= 0 &&
        (targetIndex !== chatHelpers.messages.length - 1 ||
          chatHelpers.messages[targetIndex]!.id === steeredAnswerIdRef.current)
      ) {
        const target = chatHelpers.messages[targetIndex]!;
        const targetPart = target.parts.find(
          (part) =>
            typeof part?.type === "string" &&
            isToolUIPart(part) &&
            part.toolCallId === toolCallId,
        ) as { state?: string; preliminary?: boolean } | undefined;
        // An earlier message's settled output may already have reached the model, as the error a cancelling send writes does.
        if (
          targetPart?.state === "output-error" ||
          targetPart?.state === "output-denied" ||
          (targetPart?.state === "output-available" && !targetPart.preliminary)
        )
          return Promise.resolve();

        const targetMessageId = target.id;
        chatHelpers.setMessages((current) =>
          current.map((message) => {
            if (message.id !== targetMessageId) return message;

            return {
              ...message,
              parts: message.parts.map((part) => {
                if (
                  typeof part?.type !== "string" ||
                  !isToolUIPart(part) ||
                  part.toolCallId !== toolCallId
                )
                  return part;

                const { preliminary: _preliminary, ...finalPart } =
                  part as typeof part & { preliminary?: boolean };
                return {
                  ...finalPart,
                  state: isError
                    ? ("output-error" as const)
                    : ("output-available" as const),
                  output: isError ? undefined : output,
                  errorText: isError ? errorText : undefined,
                } as typeof part;
              }),
            };
          }),
        );
        return Promise.resolve();
      }

      const options = { metadata: lastRunConfigRef.current };
      if (isError) {
        return Promise.resolve(
          chatHelpers.addToolOutput({
            state: "output-error",
            tool: toolName ?? toolCallId,
            toolCallId,
            errorText,
            options,
          }),
        );
      }

      return Promise.resolve(
        chatHelpers.addToolOutput({
          tool: toolName,
          toolCallId,
          output,
          options,
        }),
      );
    },
    onRespondToToolApproval: (response) => {
      if (supersededApprovalProjection.approvalIds.has(response.approvalId))
        return Promise.reject(
          new Error(
            `Tool approval ${response.approvalId} is not waiting for a response.`,
          ),
        );
      return customOnRespondToToolApproval
        ? respondViaHost(customOnRespondToToolApproval, response)
        : respondViaAISDK(response);
    },
    unstable_onRecordToolInteraction: ({
      messageId,
      toolCallId,
      interaction,
    }) => {
      toolInteractionsRef.current.set(
        toolCallId,
        appendToolInteraction(
          toolInteractionsRef.current.get(toolCallId),
          interaction,
        ),
      );
      markToolInteractionsChanged();
      return persistToolInteractions(messageId);
    },
    ...pickExternalStoreSharedOptions(adapter),
    ...(adapter.unstable_messageRepositoryInstance && {
      unstable_messageRepositoryInstance:
        adapter.unstable_messageRepositoryInstance,
    }),
    ...(suggestionAdapter ? { suggestions: generatedSuggestions } : {}),
    ...(onResume && { onResume }),
    ...(onResumeToolCall && { onResumeToolCall }),
    ...(unstable_onBranchChange && { unstable_onBranchChange }),
    adapters: {
      attachments: vercelAttachmentAdapter,
      ...contextAdapters,
      ...adapters,
    },
    extras,
    isLoading,
  });

  const setMessagesRef = useRef(chatHelpers.setMessages);
  useInsertionEffect(() => {
    setMessagesRef.current = chatHelpers.setMessages;
  }, [chatHelpers.setMessages]);

  useEffect(() => {
    if (hasSeededRepositoryRef.current) return;
    if (!exportedMessageRepository) return;
    if (chatHelpers.messages.length > 0) {
      hasSeededRepositoryRef.current = true;
      return;
    }
    const tempRepo = new MessageRepository();
    tempRepo.import(exportedMessageRepository);
    setMessagesRef.current(
      tempRepo.getMessages().flatMap(getExternalStoreMessages<UI_MESSAGE>),
    );
    hasSeededRepositoryRef.current = true;
  }, [exportedMessageRepository, chatHelpers.messages.length]);
  return runtime;
};

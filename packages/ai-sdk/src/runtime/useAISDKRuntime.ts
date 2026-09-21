"use client";

import {
  useCallback,
  useEffect,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
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
} from "@assistant-ui/core";
import {
  getExternalStoreMessages,
  pickExternalStoreSharedOptions,
} from "@assistant-ui/core";
import {
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
import { wrapModelContentEnvelope } from "../converters/modelContentEnvelope";
import {
  type AISDKStorageFormat,
  aiSDKV6FormatAdapter,
} from "../adapters/aiSDKFormatAdapter";
import {
  useExternalHistory,
  toExportedMessageRepository,
} from "./useExternalHistory";
import { useStreamingTiming } from "./useStreamingTiming";
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
     * an owner it lives only as long as this runtime and a remount over the
     * same chat reopens the request.
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
     * Called for every approval request in the thread with the complete response, including option and free-form answers. Hand requests the host does not own to `respondViaAISDK`, which is what runs when this option is omitted. The answer applies to the approval when the handler starts and is removed if it throws. It is never written into the `useChat` messages, so `sendAutomaticallyWhen` cannot forward it. Until the chat records the resolution itself, a second response to the same request rejects. With `unstable_hostApprovalOwner` set, which is what `AISDKThreads` passes, the answer belongs to that chat rather than to this runtime, so a runtime mounted again over the same chat still shows the request answered; the answer is retired once the chat reports the outcome. Without an owner the answer lasts only as long as this runtime, and a remount shows the request open again.
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
  const adapterRef = useRef(suggestionAdapter);
  useInsertionEffect(() => {
    adapterRef.current = suggestionAdapter;
  }, [suggestionAdapter]);
  const hasAdapter = suggestionAdapter != null;

  useEffect(() => {
    const clearSuggestions = () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
      setSuggestions((prev) => (prev.length === 0 ? prev : EMPTY_SUGGESTIONS));
    };

    const adapter = adapterRef.current;
    if (!adapter) {
      clearSuggestions();
      wasRunningRef.current = isRunning;
      return;
    }

    if (isRunning) {
      if (!wasRunningRef.current) {
        clearSuggestions();
      }
      wasRunningRef.current = true;
      return;
    }

    if (!wasRunningRef.current) return;
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
          onUpdate: setSuggestions,
        });
      } catch {}
    })();
  }, [hasAdapter, isRunning]);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  return suggestions;
};

const NO_CANCELLED_MESSAGE_IDS: ReadonlySet<string> = new Set();

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
const hostToolApprovalsByChat = new WeakMap<
  object,
  Map<string, RespondToToolApprovalOptions>
>();

/**
 * The answers live on the owner, but each mounted runtime renders them from
 * its own state, so a write has to be announced: the runtime that performed it
 * may already be unmounted (a rollback resolving after a remount), and another
 * runtime may be mounted over the same owner.
 */
const hostApprovalListenersByChat = new WeakMap<object, Set<() => void>>();

const subscribeToHostApprovals = (owner: object, listener: () => void) => {
  const listeners = hostApprovalListenersByChat.get(owner) ?? new Set();
  hostApprovalListenersByChat.set(owner, listeners);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notifyHostApprovals = (owner: object) => {
  for (const listener of [...(hostApprovalListenersByChat.get(owner) ?? [])]) {
    listener();
  }
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
  } = adapter;
  const suggestionAdapter = adapters?.suggestion;
  const contextAdapters = useRuntimeAdapters();
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
  const ownedApprovals = approvalOwner
    ? (hostToolApprovalsByChat.get(approvalOwner) ??
      (() => {
        const created = new Map<string, RespondToToolApprovalOptions>();
        hostToolApprovalsByChat.set(approvalOwner, created);
        return created;
      })())
    : undefined;
  const [toolApprovalResponses, setToolApprovalResponses] = useState<
    ReadonlyMap<string, RespondToToolApprovalOptions>
  >(() =>
    ownedApprovals && ownedApprovals.size > 0
      ? new Map(ownedApprovals)
      : NO_TOOL_APPROVAL_RESPONSES,
  );
  const hostApprovalIdsRef = useRef(new Set<string>(ownedApprovals?.keys()));

  // The owner's record is shared, so this runtime re-reads it whenever it is
  // written rather than only at mount: the write may come from a runtime that
  // has since unmounted, or from another runtime mounted over the same owner.
  useEffect(() => {
    if (!approvalOwner || !ownedApprovals) return undefined;
    return subscribeToHostApprovals(approvalOwner, () => {
      hostApprovalIdsRef.current = new Set<string>(ownedApprovals.keys());
      setToolApprovalResponses(
        ownedApprovals.size > 0
          ? new Map(ownedApprovals)
          : NO_TOOL_APPROVAL_RESPONSES,
      );
    });
  }, [approvalOwner, ownedApprovals]);

  // A stored answer is only needed while the chat has no record of the
  // approval's outcome. Once the chat reports the request as anything other
  // than still-requested (responded, cancelled, expired), the answer is
  // retired, so it cannot be applied by id against a resolution the chat
  // already owns, and the per-chat record does not grow without bound.
  useEffect(() => {
    if (!ownedApprovals || ownedApprovals.size === 0) return;
    const stillRequested = new Set<string>();
    for (const message of chatHelpers.messages) {
      for (const part of message.parts) {
        if (isToolUIPart(part) && part.state === "approval-requested") {
          stillRequested.add(part.approval.id);
        }
      }
    }
    let retired = false;
    for (const approvalId of [...ownedApprovals.keys()]) {
      if (stillRequested.has(approvalId)) continue;
      ownedApprovals.delete(approvalId);
      hostApprovalIdsRef.current.delete(approvalId);
      retired = true;
    }
    if (retired) {
      setToolApprovalResponses(
        ownedApprovals.size > 0
          ? new Map(ownedApprovals)
          : NO_TOOL_APPROVAL_RESPONSES,
      );
    }
  }, [chatHelpers.messages, ownedApprovals]);

  // A runtime kept mounted across a change of owner must not carry the
  // previous chat's answers: a reused approval id would render as already
  // answered and reject a genuine response.
  const lastApprovalOwnerRef = useRef(approvalOwner);
  if (lastApprovalOwnerRef.current !== approvalOwner) {
    lastApprovalOwnerRef.current = approvalOwner;
    hostApprovalIdsRef.current = new Set<string>(ownedApprovals?.keys());
    setToolApprovalResponses(
      ownedApprovals && ownedApprovals.size > 0
        ? new Map(ownedApprovals)
        : NO_TOOL_APPROVAL_RESPONSES,
    );
  }
  const toolArgsKeyOrderCacheRef = useRef<Map<string, Map<string, string[]>>>(
    new Map(),
  );
  const toolLastInputCacheRef = useRef<Map<string, ReadonlyJSONObject>>(
    new Map(),
  );
  const toolArgsTextCacheRef = useRef<
    WeakMap<ReadonlyJSONObject, Map<string, string>>
  >(new WeakMap());
  const mcpAppMetadataCacheRef = useRef<Map<string, McpAppMetadata>>(new Map());
  const lastRunConfigRef = useRef<RunConfig | undefined>(undefined);

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

  const cancelledMessageIds =
    cancelledMessages?.chatId === chatHelpers.id
      ? cancelledMessages.ids
      : NO_CANCELLED_MESSAGE_IDS;
  const supportsRichToolApprovalResponses =
    customOnRespondToToolApproval != null;

  const toThreadMessages = useCallback(
    (sourceMessages: UI_MESSAGE[]) => {
      const metadata: AISDKMessageConverterMetadata = {
        supportsRichToolApprovalResponses,
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
      setCancelledMessages((prev) => {
        if (prev?.chatId !== chatId || !prev.ids.has(messageId)) return prev;
        const ids = new Set(prev.ids);
        ids.delete(messageId);
        return { chatId, ids };
      });
    },
    [],
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
        supportsRichToolApprovalResponses,
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

  const { isLoading, deleteMessage: deleteHistoryMessage } = useExternalHistory(
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
  );

  const {
    id: chatId,
    messages: chatMessages,
    status: chatStatus,
    error,
  } = chatHelpers;
  const extras = useMemo(
    () =>
      aiSDKExtras.provide({
        chat: chatHelpers as unknown as UseChatHelpers<UIMessage>,
        error,
      }),
    // oxlint-disable-next-line react/exhaustive-deps -- keyed on the chat's identity and reactive snapshots; useChat re-mints the helpers object every render while its remaining fields are instance-bound methods, and a render-stable extras identity is what lets the external-store core dedupe adapter updates
    [chatId, chatMessages, chatStatus, error],
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
          if (!isToolUIPart(part)) return part;
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
      .flatMap((message) => message.parts)
      .filter(isToolUIPart)
      .find(
        (part) =>
          part.state === "approval-requested" &&
          part.approval.id === approvalId,
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
    // Whether this response is currently applied, tracked here rather than
    // read back from the id ref: that ref follows the chat on screen and is
    // reseeded when the owner changes, so it cannot answer for this response.
    let isApplied = false;
    const applyResponse = (applied: boolean) => {
      isApplied = applied;
      // The captured record is always corrected, so a rollback reaches the
      // chat the response belongs to even after the owner moved on.
      if (applied) startedWith?.set(approvalId, response);
      else startedWith?.delete(approvalId);

      if (startedOwner) {
        // Every runtime mounted over that owner re-reads the record, including
        // one mounted after this response started.
        notifyHostApprovals(startedOwner);
        return;
      }

      // Without an owner the answer belongs to this runtime alone.
      if (applied) hostApprovalIdsRef.current.add(approvalId);
      else hostApprovalIdsRef.current.delete(approvalId);
      setToolApprovalResponses((prev) => {
        const responses = new Map(prev);
        if (applied) responses.set(approvalId, response);
        else responses.delete(approvalId);
        return responses;
      });
    };

    applyResponse(true);
    try {
      await onRespond(response, {
        toolCallId: requested.toolCallId,
        toolName: getToolName(requested),
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
  };

  const hasSeededRepositoryRef = useRef(false);
  const shouldFeedRepository =
    exportedMessageRepository != null &&
    !hasSeededRepositoryRef.current &&
    messages.length === 0;

  const runtime = useExternalStoreRuntime({
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
    onCancel: async () => {
      const message = chatHelpers.messages.at(-1);
      const cancelledId =
        isRunning && message?.role === "assistant" ? message.id : undefined;
      if (cancelledId) {
        const liveIds = new Set(chatHelpers.messages.map((m) => m.id));
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
      try {
        await chatHelpers.stop();
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError")) {
          if (cancelledId) retractCancellation(chatHelpers.id, cancelledId);
          throw error;
        }
      }
    },
    onNew: async (message) => {
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
    },
    onEdit: async (message) => {
      const createMessage = (
        customToCreateMessage ?? toCreateMessage
      )<UI_MESSAGE>(message);

      if (!(message.startRun ?? message.role === "user")) {
        chatHelpers.setMessages((current) => [
          ...sliceMessagesUntil(current, message.parentId),
          toUIMessage<UI_MESSAGE>(createMessage, message.role),
        ]);
        return;
      }

      lastRunConfigRef.current = message.runConfig;
      chatHelpers.setMessages((current) =>
        sliceMessagesUntil(current, message.parentId),
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
      lastRunConfigRef.current = config.runConfig;
      const newMessages = sliceMessagesUntil(chatHelpers.messages, parentId);
      chatHelpers.setMessages(newMessages);

      await chatHelpers.regenerate({ metadata: config.runConfig });
    },
    onAddToolResult: ({
      toolCallId,
      toolName,
      result,
      isError,
      modelContent,
    }) => {
      const options = { metadata: lastRunConfigRef.current };
      if (isError) {
        return Promise.resolve(
          chatHelpers.addToolOutput({
            state: "output-error",
            tool: toolName ?? toolCallId,
            toolCallId,
            errorText:
              typeof result === "string" ? result : JSON.stringify(result),
            options,
          }),
        );
      } else {
        const output =
          modelContent !== undefined
            ? wrapModelContentEnvelope(result, modelContent)
            : result;
        return Promise.resolve(
          chatHelpers.addToolOutput({
            tool: toolName,
            toolCallId,
            output,
            options,
          }),
        );
      }
    },
    onRespondToToolApproval: customOnRespondToToolApproval
      ? (response) => respondViaHost(customOnRespondToToolApproval, response)
      : respondViaAISDK,
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

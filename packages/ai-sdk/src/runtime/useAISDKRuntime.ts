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
import { isToolUIPart, generateId } from "ai";
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
import { sliceMessagesUntil } from "../utils/sliceMessagesUntil";
import { toCreateMessage } from "../converters/toCreateMessage";
import { vercelAttachmentAdapter } from "../adapters/vercelAttachmentAdapter";
import { getVercelAIMessages } from "../utils/getVercelAIMessages";
import { AISDKMessageConverter } from "../converters/convertMessage";
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
  const toolArgsKeyOrderCacheRef = useRef<Map<string, Map<string, string[]>>>(
    new Map(),
  );
  const toolLastInputCacheRef = useRef<Map<string, ReadonlyJSONObject>>(
    new Map(),
  );
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
    metadata: useMemo(
      () => ({
        toolStatuses,
        messageTiming,
        toolArgsKeyOrderCache: toolArgsKeyOrderCacheRef.current,
        toolLastInputCache: toolLastInputCacheRef.current,
        mcpAppMetadataCache: mcpAppMetadataCacheRef.current,
        ...(optimisticMessageId && { optimisticMessageId }),
        ...(chatHelpers.error && { error: chatHelpers.error.message }),
        ...(cancelledMessageIds.size > 0 && { cancelledMessageIds }),
      }),
      [
        toolStatuses,
        messageTiming,
        optimisticMessageId,
        chatHelpers.error,
        cancelledMessageIds,
      ],
    ),
  });

  const exportedMessageRepository = useMemo(() => {
    if (!messageRepository) return undefined;
    const converted = toExportedMessageRepository(
      AISDKMessageConverter.toThreadMessages as (
        messages: UI_MESSAGE[],
      ) => ThreadMessage[],
      messageRepository,
    );
    return converted.messages.length > 0 ? converted : undefined;
  }, [messageRepository]);

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
    AISDKMessageConverter.toThreadMessages as (
      messages: UI_MESSAGE[],
    ) => ThreadMessage[],
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
    // is dispatched (append() / startRun()). All we need to do here is
    // mark any tool without a result as cancelled in the UI message list.

    // Mark any tool without a result as cancelled (uses setMessages to avoid triggering sendAutomaticallyWhen)
    chatHelpers.setMessages((messages) => {
      const lastMessage = messages.at(-1);
      if (lastMessage?.role !== "assistant") return messages;

      let hasChanges = false;
      const parts = lastMessage.parts?.map((part) => {
        if (!isToolUIPart(part)) return part;
        if (
          part.state === "output-available" ||
          part.state === "output-error" ||
          part.state === "output-denied"
        )
          return part;

        hasChanges = true;
        const { approval: _approval, ...rest } = part;
        return {
          ...rest,
          state: "output-error" as const,
          errorText: "User cancelled tool call by sending a new message.",
        };
      });

      if (!hasChanges) return messages;
      return [...messages.slice(0, -1), { ...lastMessage, parts }];
    });
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
      const exportedRepo = toExportedMessageRepository(
        AISDKMessageConverter.toThreadMessages,
        repo,
      );

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
    onRespondToToolApproval: ({ approvalId, approved, reason }) =>
      Promise.resolve(
        chatHelpers.addToolApprovalResponse({
          id: approvalId,
          approved,
          ...(reason != null && { reason }),
          options: { metadata: lastRunConfigRef.current },
        }),
      ),
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

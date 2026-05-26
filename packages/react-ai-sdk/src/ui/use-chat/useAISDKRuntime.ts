"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { UIMessage, useChat, CreateUIMessage } from "@ai-sdk/react";
import { isToolUIPart, generateId } from "ai";
import {
  useExternalStoreRuntime,
  useRuntimeAdapters,
} from "@assistant-ui/core/react";
import type { ToolExecutionStatus } from "@assistant-ui/core";
import type {
  ExternalStoreAdapter,
  ThreadHistoryAdapter,
  AssistantRuntime,
  ThreadMessage,
  ThreadSuggestion,
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
  AppendMessage,
  RunConfig,
  McpAppMetadata,
} from "@assistant-ui/core";
import { getExternalStoreMessages } from "@assistant-ui/core";
import type { ReadonlyJSONObject } from "assistant-stream/utils";
import { sliceMessagesUntil } from "../utils/sliceMessagesUntil";
import { toCreateMessage } from "../utils/toCreateMessage";
import { vercelAttachmentAdapter } from "../utils/vercelAttachmentAdapter";
import { getVercelAIMessages } from "../getVercelAIMessages";
import { AISDKMessageConverter } from "../utils/convertMessage";
import { wrapModelContentEnvelope } from "../../modelContentEnvelope";
import {
  type AISDKStorageFormat,
  aiSDKV6FormatAdapter,
} from "../adapters/aiSDKFormatAdapter";
import {
  useExternalHistory,
  toExportedMessageRepository,
} from "./useExternalHistory";
import { useStreamingTiming } from "./useStreamingTiming";

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

export type AISDKRuntimeAdapter = {
  adapters?:
    | (NonNullable<ExternalStoreAdapter["adapters"]> & {
        history?: ThreadHistoryAdapter | undefined;
      })
    | undefined;
  toCreateMessage?: CustomToCreateMessageFunction;
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
   * Follow up suggestions to surface on the thread. Use this to drive
   * dynamic suggestions from application state, tool results, or backend
   * responses; flows into `thread.suggestions` and is rendered by
   * components that read it (such as the shadcn `ThreadFollowupSuggestions`).
   */
  suggestions?: readonly ThreadSuggestion[] | undefined;
};

export const useAISDKRuntime = <UI_MESSAGE extends UIMessage = UIMessage>(
  chatHelpers: ReturnType<typeof useChat<UI_MESSAGE>>,
  {
    adapters,
    toCreateMessage: customToCreateMessage,
    cancelPendingToolCallsOnSend = true,
    onResume,
    suggestions,
  }: AISDKRuntimeAdapter = {},
) => {
  const contextAdapters = useRuntimeAdapters();
  const [toolStatuses, setToolStatuses] = useState<
    Record<string, ToolExecutionStatus>
  >({});
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
  const isRunning =
    chatHelpers.status === "submitted" ||
    chatHelpers.status === "streaming" ||
    hasExecutingTools;

  const messageTiming = useStreamingTiming(chatHelpers.messages, isRunning);

  const messages = AISDKMessageConverter.useThreadMessages({
    isRunning,
    messages: chatHelpers.messages,
    metadata: useMemo(
      () => ({
        toolStatuses,
        messageTiming,
        toolArgsKeyOrderCache: toolArgsKeyOrderCacheRef.current,
        toolLastInputCache: toolLastInputCacheRef.current,
        mcpAppMetadataCache: mcpAppMetadataCacheRef.current,
        ...(chatHelpers.error && { error: chatHelpers.error.message }),
      }),
      [toolStatuses, messageTiming, chatHelpers.error],
    ),
  });

  const [runtimeRef] = useState(() => ({
    get current(): AssistantRuntime {
      return runtime;
    },
  }));

  const isLoading = useExternalHistory(
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
        if (part.state === "output-available" || part.state === "output-error")
          return part;

        hasChanges = true;
        return {
          ...part,
          state: "output-error" as const,
          errorText: "User cancelled tool call by sending a new message.",
        };
      });

      if (!hasChanges) return messages;
      return [...messages.slice(0, -1), { ...lastMessage, parts }];
    });
  };

  const runtime = useExternalStoreRuntime({
    isRunning,
    messages,
    unstable_enableToolInvocations: true,
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
      // The embedded tracker's abort() is invoked by the runtime's
      // cancelRun before this callback runs.
      chatHelpers.stop();
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
        chatHelpers.addToolOutput({
          state: "output-error",
          tool: toolName ?? toolCallId,
          toolCallId,
          errorText:
            typeof result === "string" ? result : JSON.stringify(result),
          options,
        });
      } else {
        const output =
          modelContent !== undefined
            ? wrapModelContentEnvelope(result, modelContent)
            : result;
        chatHelpers.addToolResult({
          tool: toolName,
          toolCallId,
          output,
          options,
        });
      }
    },
    // onResumeToolCall: the runtime calls the embedded tracker's resume()
    // automatically before invoking this callback, so no adapter-level
    // handler is needed.
    onRespondToToolApproval: ({ approvalId, approved, reason }) => {
      void chatHelpers.addToolApprovalResponse({
        id: approvalId,
        approved,
        ...(reason != null && { reason }),
        options: { metadata: lastRunConfigRef.current },
      });
    },
    ...(onResume && { onResume }),
    ...(suggestions && { suggestions }),
    adapters: {
      attachments: vercelAttachmentAdapter,
      ...contextAdapters,
      ...adapters,
    },
    isLoading,
  });

  // Mirror the embedded tracker's tool-status map into local React state
  // so the AI-SDK message converter (which reads metadata.toolStatuses)
  // sees status changes. The tracker keeps the same Map reference until a
  // status actually changes, so this is a no-op for unrelated thread updates.
  const lastStatusesRef = useRef<ReadonlyMap<string, ToolExecutionStatus>>(
    new Map(),
  );
  const subscribeThread = useCallback(
    (cb: () => void) => runtime.thread.subscribe(cb),
    [runtime],
  );
  const getStatusesMap = useCallback(
    () => runtime.thread.getToolStatuses(),
    [runtime],
  );
  const toolStatusesMap = useSyncExternalStore(
    subscribeThread,
    getStatusesMap,
    getStatusesMap,
  );
  if (toolStatusesMap !== lastStatusesRef.current) {
    lastStatusesRef.current = toolStatusesMap;
    setToolStatuses(
      Object.fromEntries(toolStatusesMap) as Record<
        string,
        ToolExecutionStatus
      >,
    );
  }

  return runtime;
};

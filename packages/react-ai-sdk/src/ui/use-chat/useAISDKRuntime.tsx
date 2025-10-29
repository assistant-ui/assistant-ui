"use client";

import { useState, useMemo, useEffect } from "react";
import type { UIMessage, useChat } from "@ai-sdk/react";
import {
  useExternalStoreRuntime,
  ExternalStoreAdapter,
  ThreadHistoryAdapter,
  AssistantRuntime,
  ThreadMessage,
  MessageFormatAdapter,
  useRuntimeAdapters,
  INTERNAL,
  type ToolExecutionStatus,
} from "@assistant-ui/react";
import { sliceMessagesUntil } from "../utils/sliceMessagesUntil";
import { toCreateMessage } from "../utils/toCreateMessage";
import { vercelAttachmentAdapter } from "../utils/vercelAttachmentAdapter";
import { getVercelAIMessages } from "../getVercelAIMessages";
import { AISDKMessageConverter } from "../utils/convertMessage";
import {
  AISDKStorageFormat,
  aiSDKV5FormatAdapter,
} from "../adapters/aiSDKFormatAdapter";
import { useExternalHistory } from "./useExternalHistory";
import { getItemId, normalizeDuration } from "../utils/providerMetadata";

export type AISDKRuntimeAdapter = {
  adapters?:
    | (NonNullable<ExternalStoreAdapter["adapters"]> & {
        history?: ThreadHistoryAdapter | undefined;
      })
    | undefined;
};

export const useAISDKRuntime = <UI_MESSAGE extends UIMessage = UIMessage>(
  chatHelpers: ReturnType<typeof useChat<UI_MESSAGE>>,
  { adapters }: AISDKRuntimeAdapter = {},
) => {
  const contextAdapters = useRuntimeAdapters();
  const isRunning =
    chatHelpers.status === "submitted" || chatHelpers.status == "streaming";

  const [toolStatuses, setToolStatuses] = useState<
    Record<string, ToolExecutionStatus>
  >({});

  const helperMessages = chatHelpers.messages;

  // Track reasoning timing in state (for converter to access during streaming)
  const [reasoningTimings, setReasoningTimings] = useState<
    Map<string, { start: number; end?: number }>
  >(new Map());
  const [reasoningDurations, setReasoningDurations] = useState<
    Record<string, number>
  >({});

  // Track reasoning state and compute durations
  useEffect(() => {
    if (helperMessages.length === 0) return;

    const nextTimings = new Map(reasoningTimings);
    const nextDurations = { ...reasoningDurations };
    let changed = false;

    helperMessages.forEach((message) => {
      if (message.role !== "assistant") return;

      message.parts?.forEach((part, partIndex) => {
        if (part.type !== "reasoning") return;

        const itemId = getItemId(part);
        const key = itemId || `part-${partIndex}`;

        // Start timing when reasoning begins
        if (part.state === "streaming" && !nextTimings.has(key)) {
          nextTimings.set(key, { start: Date.now() });
          changed = true;
        }

        // Finalize duration when done
        if (part.state === "done") {
          const timing = nextTimings.get(key) || { start: Date.now() };
          const end = timing.end || Date.now();
          const elapsed = end - timing.start;
          const duration = normalizeDuration(Math.ceil(elapsed / 1000));

          if (duration !== undefined && nextDurations[key] !== duration) {
            nextDurations[key] = duration;
            changed = true;
          }

          if (!timing.end) {
            nextTimings.set(key, { ...timing, end });
            changed = true;
          }
        }
      });
    });

    if (changed) {
      setReasoningTimings(nextTimings);
      setReasoningDurations(nextDurations);
    }
  }, [helperMessages, reasoningTimings, reasoningDurations]);

  // Convert AI SDK UIMessages to assistant-ui ThreadMessages
  // Pass runtime durations via metadata for converter to access during streaming
  // Annotations are used only for persistence (written on save, read on reload)
  const messages = AISDKMessageConverter.useThreadMessages({
    isRunning,
    messages: chatHelpers.messages,
    metadata: useMemo(
      () => ({ toolStatuses, reasoningDurations }),
      [toolStatuses, reasoningDurations],
    ),
  });

  const [runtimeRef] = useState(() => ({
    get current(): AssistantRuntime {
      return runtime;
    },
  }));

  const toolInvocations = INTERNAL.useToolInvocations({
    state: {
      messages,
      isRunning,
    },
    getTools: () => runtimeRef.current.thread.getModelContext().tools,
    onResult: (command: any) => {
      if (command.type === "add-tool-result") {
        chatHelpers.addToolResult({
          tool: command.toolName,
          toolCallId: command.toolCallId,
          output: command.result,
        });
      }
    },
    setToolStatuses,
  });

  const isLoading = useExternalHistory(
    runtimeRef,
    adapters?.history ?? contextAdapters?.history,
    AISDKMessageConverter.toThreadMessages as (
      messages: UI_MESSAGE[],
    ) => ThreadMessage[],
    aiSDKV5FormatAdapter as MessageFormatAdapter<
      UI_MESSAGE,
      AISDKStorageFormat
    >,
    (messages) => {
      chatHelpers.setMessages(messages);
    },
  );

  const runtime = useExternalStoreRuntime({
    isRunning,
    messages,
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
    onCancel: async () => {
      chatHelpers.stop();
      toolInvocations.abort();
    },
    onNew: async (message) => {
      const createMessage = toCreateMessage<UI_MESSAGE>(message);
      await chatHelpers.sendMessage(createMessage, {
        metadata: message.runConfig,
      });
    },
    onEdit: async (message) => {
      const newMessages = sliceMessagesUntil(
        chatHelpers.messages,
        message.parentId,
      );
      chatHelpers.setMessages(newMessages);

      const createMessage = toCreateMessage<UI_MESSAGE>(message);
      await chatHelpers.sendMessage(createMessage, {
        metadata: message.runConfig,
      });
    },
    onReload: async (parentId: string | null, config) => {
      const newMessages = sliceMessagesUntil(chatHelpers.messages, parentId);
      chatHelpers.setMessages(newMessages);

      await chatHelpers.regenerate({ metadata: config.runConfig });
    },
    onAddToolResult: ({ toolCallId, result }) => {
      chatHelpers.addToolResult({
        tool: toolCallId,
        toolCallId,
        output: result,
      });
    },
    onResumeToolCall: (options) =>
      toolInvocations.resume(options.toolCallId, options.payload),
    adapters: {
      attachments: vercelAttachmentAdapter,
      ...contextAdapters,
      ...adapters,
    },
    isLoading,
  });

  return runtime;
};

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
import {
  createReasoningOrdinalContext,
  makeReasoningRuntimeKey,
  normalizeDuration,
  sanitizeHistoryForOutbound,
} from "../utils/reasoning";

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
      if (message.role !== "assistant" || !message.id) return;

      const messageId = message.id;
      // Group reasoning chunks so duration timers follow the same ordinal keys as storage.
      const ordinalContext = createReasoningOrdinalContext();

      message.parts?.forEach((part, partIndex) => {
        if (part.type !== "reasoning") return;

        const { ordinal } = ordinalContext.getOrdinal(part, partIndex);
        const runtimeKey = makeReasoningRuntimeKey(messageId, ordinal);

        if (part.state === "streaming" && !nextTimings.has(runtimeKey)) {
          nextTimings.set(runtimeKey, { start: Date.now() });
          changed = true;
        }

        if (part.state === "done") {
          const timing = nextTimings.get(runtimeKey) || { start: Date.now() };
          const end = timing.end || Date.now();
          const elapsed = end - timing.start;
          const duration = normalizeDuration(Math.ceil(elapsed / 1000));

          if (
            duration !== undefined &&
            nextDurations[runtimeKey] !== duration
          ) {
            nextDurations[runtimeKey] = duration;
            changed = true;
          }

          if (!timing.end) {
            nextTimings.set(runtimeKey, { ...timing, end });
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
      const sanitized = sanitizeHistoryForOutbound(newMessages);
      chatHelpers.setMessages(sanitized);

      const createMessage = toCreateMessage<UI_MESSAGE>(message);
      await chatHelpers.sendMessage(createMessage, {
        metadata: message.runConfig,
      });
    },
    onReload: async (parentId: string | null, config) => {
      const newMessages = sliceMessagesUntil(chatHelpers.messages, parentId);
      const sanitized = sanitizeHistoryForOutbound(newMessages);
      chatHelpers.setMessages(sanitized);

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

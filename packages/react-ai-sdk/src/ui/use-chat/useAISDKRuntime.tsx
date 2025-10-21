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
// import { useReasoningDuration } from "../hooks/useReasoningDuration";
import { getItemId } from "../utils/providerMetadata";



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

  // Maintain timing state separately (survives AI SDK message updates)
  const [reasoningTimings, setReasoningTimings] = useState<
    Record<string, { start: number; end?: number }>
  >({});
  const [reasoningDurations, setReasoningDurations] = useState<
    Record<string, number>
  >({});

  // Track reasoning state transitions to maintain reliable timing data
  useEffect(() => {
    const newTimings = { ...reasoningTimings };
    const newDurations = { ...reasoningDurations };
    let timingsChanged = false;
    let durationsChanged = false;

    chatHelpers.messages.forEach((msg) => {
      msg.parts?.forEach((part, idx) => {
        if (part.type !== "reasoning") return;

        const itemId = getItemId(part);
        const key = itemId ? `${msg.id}:${itemId}` : `${msg.id}:${idx}`;

        // Start timing when reasoning begins
        if (part.state === "streaming" && !newTimings[key]) {
          newTimings[key] = { start: Date.now() };
          timingsChanged = true;
          if (key in newDurations) {
            delete newDurations[key];
            durationsChanged = true;
          }
        }
        // End timing when reasoning completes
        else if (
          part.state === "done" &&
          newTimings[key] &&
          !newTimings[key].end
        ) {
          const existing = newTimings[key]!;
          const end = Date.now();
          const start = existing.start;
          newTimings[key] = { ...existing, end };
          timingsChanged = true;

          const durationSeconds = Math.max(
            0,
            Math.ceil((end - start) / 1000),
          );
          if (newDurations[key] !== durationSeconds) {
            newDurations[key] = durationSeconds;
            durationsChanged = true;
          }
        }
      });
    });

    if (timingsChanged) setReasoningTimings(newTimings);
    if (durationsChanged) setReasoningDurations(newDurations);
  }, [chatHelpers.messages, reasoningTimings, reasoningDurations]);

  // Cleanup: remove timing data for messages that no longer exist
  useEffect(() => {
    const currentKeys = new Set<string>();
    chatHelpers.messages.forEach((msg) => {
      msg.parts?.forEach((part, idx) => {
        if (part.type === "reasoning") {
          const itemId = getItemId(part);
          const key = itemId ? `${msg.id}:${itemId}` : `${msg.id}:${idx}`;
          currentKeys.add(key);
        }
      });
    });

    setReasoningTimings((prev) => {
      const filtered = Object.fromEntries(
        Object.entries(prev).filter(([key]) => currentKeys.has(key)),
      );
      return Object.keys(filtered).length !== Object.keys(prev).length
        ? filtered
        : prev;
    });

    setReasoningDurations((prev) => {
      const filtered = Object.fromEntries(
        Object.entries(prev).filter(([key]) => currentKeys.has(key)),
      );
      return Object.keys(filtered).length !== Object.keys(prev).length
        ? filtered
        : prev;
    });
  }, [chatHelpers.messages]);

  // Ensure final durations are persisted into providerMetadata once reasoning completes
  const helperMessages = chatHelpers.messages;
  const setHelperMessages = chatHelpers.setMessages;

  useEffect(() => {
    if (Object.keys(reasoningDurations).length === 0) {
      return;
    }

    let hasChanges = false;
    const updatedMessages = helperMessages.map((msg) => {
      let messageChanged = false;
      const updatedParts = msg.parts?.map((part, idx) => {
        if (part.type !== "reasoning") {
          return part;
        }

        const itemId = getItemId(part);
        const key = itemId ? `${msg.id}:${itemId}` : `${msg.id}:${idx}`;
        const finalDuration = reasoningDurations[key];

        if (finalDuration === undefined) {
          return part;
        }

        const existingDuration =
          part.providerMetadata?.["assistant-ui"]?.["duration"];

        // Only update metadata when the duration is finalized and missing or stale
        if (existingDuration === finalDuration) {
          return part;
        }

        if (part.state !== "done") {
          return part;
        }

        messageChanged = true;
        return {
          ...part,
          providerMetadata: {
            ...(part.providerMetadata || {}),
            "assistant-ui": {
              ...(part.providerMetadata?.["assistant-ui"] || {}),
              duration: finalDuration,
            },
          },
        };
      });

      if (!messageChanged) {
        return msg;
      }

      hasChanges = true;
      return {
        ...msg,
        parts: updatedParts,
      };
    });

    if (hasChanges) {
      setHelperMessages(updatedMessages);
    }
  }, [helperMessages, setHelperMessages, reasoningDurations]);

  const messages = AISDKMessageConverter.useThreadMessages({
    isRunning,
    messages: chatHelpers.messages,
    metadata: useMemo(
      () => ({ toolStatuses, reasoningDurations }),
      [toolStatuses, reasoningDurations],
    ),
  });

  const runtimeRef = useMemo(
    () => ({
      get current(): AssistantRuntime {
        return runtime;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

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

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

/**
 * Extracts itemId from providerMetadata in a provider-agnostic way.
 * OpenAI uses itemId to group reasoning paragraphs that should share one timer.
 */
const getItemId = (part: any): string | undefined => {
  const metadata = part.providerMetadata;
  if (!metadata || typeof metadata !== "object") return undefined;

  for (const providerData of Object.values(metadata)) {
    if (
      providerData &&
      typeof providerData === "object" &&
      "itemId" in providerData
    ) {
      return String((providerData as any).itemId);
    }
  }
  return undefined;
};

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

  const [reasoningTimings, setReasoningTimings] = useState<
    Record<string, { start: number; end?: number }>
  >({});

  // Track reasoning state changes (simple approach like the original client-side version)
  useEffect(() => {
    const newTimings = { ...reasoningTimings };
    let hasChanges = false;

    chatHelpers.messages.forEach((msg) => {
      msg.parts?.forEach((part, idx) => {
        if (part.type !== "reasoning") return;

        // Generic itemId detection (checks all providers, not just OpenAI)
        const itemId = getItemId(part);
        const key = itemId ? `${msg.id}:${itemId}` : `${msg.id}:${idx}`;

        // Start timing when reasoning first appears with state='streaming'
        if (part.state === "streaming" && !newTimings[key]) {
          newTimings[key] = { start: Date.now() };
          hasChanges = true;
        }
        // End timing when state changes to 'done'
        else if (
          part.state === "done" &&
          newTimings[key] &&
          !newTimings[key].end
        ) {
          newTimings[key] = { ...newTimings[key], end: Date.now() };
          hasChanges = true;
        }
      });
    });

    if (hasChanges) setReasoningTimings(newTimings);
  }, [chatHelpers.messages, reasoningTimings]);

  // Cleanup: remove timings for messages that no longer exist
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
  }, [chatHelpers.messages]);

  const messages = AISDKMessageConverter.useThreadMessages({
    isRunning,
    messages: chatHelpers.messages,
    metadata: useMemo(
      () => ({ toolStatuses, reasoningTimings }),
      [toolStatuses, reasoningTimings],
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

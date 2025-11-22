"use client";

import { useState, useMemo } from "react";
import type { UIMessage, useChat, CreateUIMessage } from "@ai-sdk/react";
import {
  useExternalStoreRuntime,
  type ExternalStoreAdapter,
  type ThreadHistoryAdapter,
  type AssistantRuntime,
  type ThreadMessage,
  type MessageFormatAdapter,
  useRuntimeAdapters,
  INTERNAL,
  type ToolExecutionStatus,
  type AppendMessage,
} from "@assistant-ui/react";
import { sliceMessagesUntil } from "../utils/sliceMessagesUntil";
import { toCreateMessage } from "../utils/toCreateMessage";

export type CustomToCreateMessageFunction = <
  UI_MESSAGE extends UIMessage = UIMessage,
>(
  message: AppendMessage,
) => CreateUIMessage<UI_MESSAGE>;

import { vercelAttachmentAdapter } from "../utils/vercelAttachmentAdapter";
import { getVercelAIMessages } from "../getVercelAIMessages";
import { AISDKMessageConverter } from "../utils/convertMessage";
import {
  type AISDKStorageFormat,
  aiSDKV5FormatAdapter,
} from "../adapters/aiSDKFormatAdapter";
import { useExternalHistory } from "./useExternalHistory";

type PendingHumanTool = {
  readonly toolCallId: string;
};

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
};

export const useAISDKRuntime = <UI_MESSAGE extends UIMessage = UIMessage>(
  chatHelpers: ReturnType<typeof useChat<UI_MESSAGE>>,
  {
    adapters,
    toCreateMessage: customToCreateMessage,
    cancelPendingToolCallsOnSend = true,
  }: AISDKRuntimeAdapter = {},
) => {
  const contextAdapters = useRuntimeAdapters();
  const isRunning =
    chatHelpers.status === "submitted" || chatHelpers.status === "streaming";

  const [toolStatuses, setToolStatuses] = useState<
    Record<string, ToolExecutionStatus>
  >({});

  const messages = AISDKMessageConverter.useThreadMessages({
    isRunning,
    messages: chatHelpers.messages,
    metadata: useMemo(
      () => ({
        toolStatuses,
        ...(chatHelpers.error && { error: chatHelpers.error.message }),
      }),
      [toolStatuses, chatHelpers.error],
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
    onResult: (command) => {
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

  const completePendingToolCalls = () => {
    if (!cancelPendingToolCallsOnSend) return;

    const pendingHumanTools: PendingHumanTool[] = Object.entries(toolStatuses)
      .filter(
        (
          entry,
        ): entry is [
          string,
          Extract<ToolExecutionStatus, { type: "interrupt" }>,
        ] => entry[1]?.type === "interrupt",
      )
      .map(([toolCallId]) => ({ toolCallId }));

    if (pendingHumanTools.length === 0) return;

    // Set tool statuses to cancelled so UI can show special state
    setToolStatuses((prev) => {
      const next = { ...prev };
      pendingHumanTools.forEach(({ toolCallId }) => {
        next[toolCallId] = {
          type: "cancelled",
          reason: "User cancelled tool call by sending a new message.",
        };
      });
      return next;
    });

    // Mark tools as errored in the message history
    pendingHumanTools.forEach(({ toolCallId }) => {
      // chatHelpers.addToolOutput({
      //   state: "output-error",
      //   tool: toolCallId,
      //   toolCallId,
      //   errorText: "User cancelled tool call by sending a new message.",
      // });

      chatHelpers.setMessages(
        chatHelpers.messages.map((message) => {
          if (message.id === toolCallId) {
            return {
              ...message,
              content: [
                {
                  type: "text",
                  text: "User cancelled tool call by sending a new message.",
                },
              ],
            };
          }
          return message;
        }),
      );
    });
  };

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
      completePendingToolCalls();

      const createMessage = (
        customToCreateMessage ?? toCreateMessage
      )<UI_MESSAGE>(message);
      await chatHelpers.sendMessage(createMessage, {
        metadata: message.runConfig,
      });
    },
    onEdit: async (message) => {
      completePendingToolCalls();

      const newMessages = sliceMessagesUntil(
        chatHelpers.messages,
        message.parentId,
      );
      chatHelpers.setMessages(newMessages);

      const createMessage = (
        customToCreateMessage ?? toCreateMessage
      )<UI_MESSAGE>(message);
      await chatHelpers.sendMessage(createMessage, {
        metadata: message.runConfig,
      });
    },
    onReload: async (parentId: string | null, config) => {
      completePendingToolCalls();

      const newMessages = sliceMessagesUntil(chatHelpers.messages, parentId);
      chatHelpers.setMessages(newMessages);

      await chatHelpers.regenerate({ metadata: config.runConfig });
    },
    onAddToolResult: ({ toolCallId, result, isError }) => {
      if (isError) {
        chatHelpers.addToolOutput({
          state: "output-error",
          tool: toolCallId,
          toolCallId,
          errorText:
            typeof result === "string" ? result : JSON.stringify(result),
        });
      } else {
        chatHelpers.addToolOutput({
          state: "output-available",
          tool: toolCallId,
          toolCallId,
          output: result,
        });
      }
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

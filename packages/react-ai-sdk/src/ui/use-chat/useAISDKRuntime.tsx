"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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

type ReasoningTimingState = Record<string, { start: number; end?: number }>;
type ReasoningDurationState = Record<string, number>;

export const processReasoningDurations = <
  UI_MESSAGE extends UIMessage = UIMessage,
>(
  messages: readonly UI_MESSAGE[],
  timings: ReasoningTimingState,
  durations: ReasoningDurationState,
  getNow: () => number,
) => {
  // Early return if no messages have reasoning parts
  const hasReasoningParts = messages.some((msg) =>
    msg.parts?.some((part) => part.type === "reasoning"),
  );
  if (!hasReasoningParts) {
    return {
      timings,
      durations,
      updatedMessages: messages,
      timingsChanged: false,
      durationsChanged: false,
      messagesChanged: false,
    };
  }

  const nextTimings: ReasoningTimingState = { ...timings };
  const nextDurations: ReasoningDurationState = { ...durations };

  let timingsChanged = false;
  let durationsChanged = false;

  const messageMutations = new Map<number, UI_MESSAGE>();

  messages.forEach((message, messageIndex) => {
    let mutatedParts: UI_MESSAGE["parts"] | undefined;

    message.parts?.forEach((part, partIndex) => {
      if (part.type !== "reasoning") {
        return;
      }

      const itemId = getItemId(part);
      const key = itemId
        ? `${message.id}:${itemId}`
        : `${message.id}:${partIndex}`;
      const currentTiming = nextTimings[key];

      if (part.state === "streaming" && !currentTiming) {
        nextTimings[key] = { start: getNow() };
        timingsChanged = true;

        if (Object.prototype.hasOwnProperty.call(nextDurations, key)) {
          delete nextDurations[key];
          durationsChanged = true;
        }
      }

      if (part.state === "done") {
        const now = getNow();
        const hadTiming = Boolean(currentTiming);
        let timing = currentTiming ?? { start: now };

        if (!currentTiming) {
          nextTimings[key] = timing;
          timingsChanged = true;
        }

        if (!timing.end) {
          timing = { ...timing, end: now };
          nextTimings[key] = timing;
          timingsChanged = true;
        }

        const elapsed = timing.end! - timing.start;
        const computedDuration = hadTiming
          ? normalizeDuration(Math.ceil(elapsed / 1000))
          : undefined;

        if (
          computedDuration !== undefined &&
          nextDurations[key] !== computedDuration
        ) {
          nextDurations[key] = computedDuration;
          durationsChanged = true;
        }

        const providerDuration = normalizeDuration(
          (
            part.providerMetadata?.["assistant-ui"] as
              | Record<string, unknown>
              | undefined
          )?.["duration"] as number | undefined,
        );

        // Prefer runtime-computed duration over persisted provider metadata
        const effectiveDuration = nextDurations[key] ?? providerDuration;

        if (
          effectiveDuration !== undefined &&
          providerDuration !== effectiveDuration
        ) {
          if (!mutatedParts) {
            mutatedParts = [...(message.parts ?? [])];
          }

          mutatedParts[partIndex] = {
            ...part,
            providerMetadata: {
              ...(part.providerMetadata || {}),
              "assistant-ui": {
                ...(part.providerMetadata?.["assistant-ui"] || {}),
                duration: effectiveDuration,
              },
            },
          } as UI_MESSAGE["parts"][number];
        }
      }
    });

    if (mutatedParts) {
      messageMutations.set(messageIndex, {
        ...message,
        parts: mutatedParts,
      });
    }
  });

  const messagesChanged = messageMutations.size > 0;

  const updatedMessages = messagesChanged
    ? messages.map((message, index) => messageMutations.get(index) ?? message)
    : messages;

  return {
    timings: timingsChanged ? nextTimings : timings,
    durations: durationsChanged ? nextDurations : durations,
    timingsChanged,
    durationsChanged,
    messagesChanged,
    updatedMessages,
  } as const;
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

  // Use refs to access latest state in effect without adding to dependencies
  const reasoningTimingsRef = useRef(reasoningTimings);
  const reasoningDurationsRef = useRef(reasoningDurations);
  reasoningTimingsRef.current = reasoningTimings;
  reasoningDurationsRef.current = reasoningDurations;

  const helperMessages = chatHelpers.messages;
  const setHelperMessages = chatHelpers.setMessages;

  // Track reasoning state transitions to maintain reliable timing data
  useEffect(() => {
    if (helperMessages.length === 0) {
      return;
    }

    const result = processReasoningDurations(
      helperMessages,
      reasoningTimingsRef.current,
      reasoningDurationsRef.current,
      () => Date.now(),
    );

    if (result.timingsChanged) {
      setReasoningTimings(result.timings);
    }

    if (result.durationsChanged) {
      setReasoningDurations(result.durations);
    }

    if (result.messagesChanged) {
      setHelperMessages(result.updatedMessages as UI_MESSAGE[]);
    }
  }, [helperMessages, setHelperMessages]);

  // Cleanup: remove timing data for messages that no longer exist
  useEffect(() => {
    const currentKeys = new Set<string>();
    helperMessages.forEach((msg) => {
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
  }, [helperMessages]);

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

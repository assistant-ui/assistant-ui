"use client";

import { useMemo, useRef, useState } from "react";
import {
  pickExternalStoreSharedOptions,
  type AttachmentAdapter,
  type DictationAdapter,
  type ExternalStoreSharedOptions,
  type FeedbackAdapter,
  type RealtimeVoiceAdapter,
  type SpeechSynthesisAdapter,
  type ToolExecutionStatus,
} from "@assistant-ui/core";
import {
  useExternalStoreRuntime,
  useRuntimeAdapters,
} from "@assistant-ui/core/react";
import {
  useEveAgent,
  type EveMessageData,
  type UseEveAgentOptions,
} from "eve/react";
import {
  convertEveMessages,
  getEveMessageContent,
  toEveInputResponse,
} from "./convertEveMessages";

export type UseEveAgentRuntimeOptions = Omit<
  UseEveAgentOptions<EveMessageData>,
  "reducer"
> &
  ExternalStoreSharedOptions & {
    readonly adapters?:
      | {
          readonly attachments?: AttachmentAdapter | undefined;
          readonly speech?: SpeechSynthesisAdapter | undefined;
          readonly dictation?: DictationAdapter | undefined;
          readonly voice?: RealtimeVoiceAdapter | undefined;
          readonly feedback?: FeedbackAdapter | undefined;
        }
      | undefined;
  };

/**
 * Connects Eve's `useEveAgent` hook to assistant-ui's runtime contract.
 *
 * The runtime renders Eve messages, forwards new user messages to the Eve
 * session, supports cancellation, and maps Eve input requests to assistant-ui
 * tool approval UI.
 */
export const useEveAgentRuntime = (options: UseEveAgentRuntimeOptions = {}) => {
  const {
    adapters,
    isDisabled: _isDisabled,
    isSendDisabled: _isSendDisabled,
    suggestions: _suggestions,
    unstable_capabilities: _unstable_capabilities,
    ...agentOptions
  } = options;
  true satisfies keyof typeof agentOptions &
    keyof ExternalStoreSharedOptions extends never
    ? true
    : never;

  const agent = useEveAgent(agentOptions);
  const runtimeAdapters = useRuntimeAdapters();
  const [toolStatuses, setToolStatuses] = useState<
    Record<string, ToolExecutionStatus>
  >({});
  const createdAtByMessageIdRef = useRef(new Map<string, Date>());

  const hasExecutingTools = Object.values(toolStatuses).some(
    (status) => status?.type === "executing",
  );
  const isRunning =
    agent.status === "submitted" ||
    agent.status === "streaming" ||
    hasExecutingTools;

  const messages = useMemo(() => {
    const createdAtByMessageId = createdAtByMessageIdRef.current;
    const messageIds = new Set(
      agent.data.messages.map((message) => message.id),
    );
    for (const messageId of createdAtByMessageId.keys()) {
      if (!messageIds.has(messageId)) createdAtByMessageId.delete(messageId);
    }

    return convertEveMessages(agent.data, {
      isRunning,
      getCreatedAt: (message) => {
        const existing = createdAtByMessageId.get(message.id);
        if (existing) return existing;

        const createdAt = new Date();
        createdAtByMessageId.set(message.id, createdAt);
        return createdAt;
      },
    });
  }, [agent.data, isRunning]);

  return useExternalStoreRuntime({
    ...pickExternalStoreSharedOptions(options),
    messages,
    isRunning,
    unstable_enableToolInvocations: true,
    setToolStatuses,
    adapters: {
      attachments: adapters?.attachments ?? runtimeAdapters?.attachments,
      speech: adapters?.speech,
      dictation: adapters?.dictation,
      voice: adapters?.voice,
      feedback: adapters?.feedback,
    },
    onNew: async (message) => {
      await agent.send({ message: getEveMessageContent(message) });
    },
    onCancel: () => {
      agent.stop();
      return Promise.resolve();
    },
    onRespondToToolApproval: async (response) => {
      await agent.send({ inputResponses: [toEveInputResponse(response)] });
    },
  });
};

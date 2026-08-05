"use client";

import { useMemo, useRef, useState } from "react";
import {
  fromThreadMessageLike,
  generateId,
  pickExternalStoreSharedOptions,
  type AppendMessage,
  type AttachmentAdapter,
  type DictationAdapter,
  type ExternalStoreSharedOptions,
  type FeedbackAdapter,
  type RealtimeVoiceAdapter,
  type SpeechSynthesisAdapter,
  type ThreadMessage,
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
import type { SendTurnPayload } from "eve/client";
import {
  convertEveMessages,
  getEveMessageContent,
  toEveInputResponse,
} from "./convertEveMessages";

const USER_STAGED_STATUS = {
  type: "complete",
  reason: "unknown",
} as const;

const hasRunConfig = (
  runConfig: AppendMessage["runConfig"],
): runConfig is NonNullable<AppendMessage["runConfig"]> =>
  runConfig?.custom !== undefined && Object.keys(runConfig.custom).length > 0;

/**
 * Eve JSON-stringifies `clientContext` into a user-role context message the
 * model reads, so only the `custom` bag crosses the wire: the assistant-ui
 * `runConfig` envelope would surface a literal `"custom"` key in the prompt and
 * in every eve-side handler that reads `clientContext` as its own namespace.
 * Eve validates the object server-side and rejects non-JSON values with a 400.
 */
const toEveClientContext = (
  runConfig: AppendMessage["runConfig"],
): Pick<SendTurnPayload, "clientContext"> =>
  hasRunConfig(runConfig)
    ? {
        clientContext: runConfig.custom as NonNullable<
          SendTurnPayload["clientContext"]
        >,
      }
    : {};

const truncateThreadMessages = (
  messages: readonly ThreadMessage[],
  parentId: string | null,
) => {
  if (parentId === null) return [];
  const parentIndex = messages.findIndex((message) => message.id === parentId);
  if (parentIndex === -1) return [];
  return messages.slice(0, parentIndex + 1);
};

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
  const [stagedMessages, setStagedMessages] = useState<ThreadMessage[] | null>(
    null,
  );
  const createdAtByMessageIdRef = useRef(new Map<string, Date>());
  const stagedInputsRef = useRef(
    new Map<
      string,
      { message: AppendMessage; runConfig: AppendMessage["runConfig"] }
    >(),
  );

  const hasExecutingTools = Object.values(toolStatuses).some(
    (status) => status?.type === "executing",
  );
  const isRunning =
    agent.status === "submitted" ||
    agent.status === "streaming" ||
    hasExecutingTools;

  const convertedMessages = useMemo(() => {
    const createdAtByMessageId = createdAtByMessageIdRef.current;
    const messageIds = new Set(
      agent.data.messages.map((message) => message.id),
    );
    for (const messageId of createdAtByMessageId.keys()) {
      if (!messageIds.has(messageId)) createdAtByMessageId.delete(messageId);
    }

    return convertEveMessages(agent.data, {
      isRunning,
      error: agent.error,
      getCreatedAt: (message) => {
        const existing = createdAtByMessageId.get(message.id);
        if (existing) return existing;

        const createdAt = new Date();
        createdAtByMessageId.set(message.id, createdAt);
        return createdAt;
      },
    });
  }, [agent.data, agent.error, isRunning]);

  const messages = stagedMessages ?? convertedMessages;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const stageUserMessage = (message: AppendMessage) => {
    const threadMessage = fromThreadMessageLike(
      message,
      generateId(),
      USER_STAGED_STATUS,
    );
    stagedInputsRef.current.set(threadMessage.id, {
      message,
      runConfig: message.runConfig,
    });
    setStagedMessages([
      ...truncateThreadMessages(messagesRef.current, message.parentId),
      threadMessage,
    ]);
  };

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
      if (!(message.startRun ?? message.role === "user")) {
        stageUserMessage(message);
        return;
      }
      await agent.send({
        message: getEveMessageContent(message),
        ...toEveClientContext(message.runConfig),
      });
    },
    ...(stagedMessages
      ? {
          onReload: async (parentId: string | null, config) => {
            const staged = parentId
              ? stagedInputsRef.current.get(parentId)
              : null;
            if (!staged)
              throw new Error("Runtime does not support reloading messages.");
            stagedInputsRef.current.delete(parentId!);
            setStagedMessages(null);
            await agent.send({
              message: getEveMessageContent(staged.message),
              ...toEveClientContext(
                hasRunConfig(config.runConfig)
                  ? config.runConfig
                  : staged.runConfig,
              ),
            });
          },
        }
      : {}),
    onCancel: () => {
      agent.stop();
      return Promise.resolve();
    },
    onRespondToToolApproval: async (response) => {
      await agent.send({ inputResponses: [toEveInputResponse(response)] });
    },
  });
};

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  fromThreadMessageLike,
  generateId,
  MessageNotSentError,
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
  type UseEveAgentStatus,
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

const sendCancelledError = new MessageNotSentError(
  "eve send was dropped because the run was cancelled.",
);

const sendAbandonedError = new Error(
  "eve send was dropped because the runtime unmounted.",
);

const isDroppedSend = (error: unknown) =>
  error === sendCancelledError || error === sendAbandonedError;

type EveLifecycleCallbackName =
  | "onError"
  | "onEvent"
  | "onFinish"
  | "onSessionChange";

const reportEveLifecycleCallbackError = (
  name: EveLifecycleCallbackName,
  error: unknown,
) => {
  console.error(`[assistant-ui/eve] ${name} callback threw an error`, error);
};

const invokeEveLifecycleCallback = <T>(
  name: EveLifecycleCallbackName,
  callback: ((value: T) => unknown) | undefined,
  value: T,
) => {
  if (!callback) return;

  try {
    void Promise.resolve(callback(value)).catch((error) => {
      reportEveLifecycleCallbackError(name, error);
    });
  } catch (error) {
    reportEveLifecycleCallbackError(name, error);
  }
};

const hasRunConfig = (
  runConfig: AppendMessage["runConfig"],
): runConfig is NonNullable<AppendMessage["runConfig"]> =>
  runConfig?.custom !== undefined && Object.keys(runConfig.custom).length > 0;

/**
 * Only the `custom` bag crosses the wire. Eve reads `clientContext` as its own
 * namespace and serializes it into a model-visible context message, so sending
 * the assistant-ui envelope would surface a literal `"custom"` key in the
 * prompt and to every eve-side handler.
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

  const { onError, onEvent, onFinish, onSessionChange } = agentOptions;
  const lastFinishStatusRef = useRef<UseEveAgentStatus | null>(null);
  const agent = useEveAgent({
    ...agentOptions,
    ...(onError
      ? {
          onError: (error) =>
            invokeEveLifecycleCallback("onError", onError, error),
        }
      : {}),
    ...(onEvent
      ? {
          onEvent: (event) =>
            invokeEveLifecycleCallback("onEvent", onEvent, event),
        }
      : {}),
    onFinish: (snapshot) => {
      lastFinishStatusRef.current = snapshot.status;
      invokeEveLifecycleCallback("onFinish", onFinish, snapshot);
    },
    ...(onSessionChange
      ? {
          onSessionChange: (session) =>
            invokeEveLifecycleCallback(
              "onSessionChange",
              onSessionChange,
              session,
            ),
        }
      : {}),
  });
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

  // Upstream `EveAgentStore.send` rejects while a turn is in flight and only
  // resolves once the turn's stream parks, so a pending chain link is exactly
  // an active turn; chaining every send serializes them without watching
  // status.
  const sendChainRef = useRef<Promise<void>>(Promise.resolve());
  const sendEpochRef = useRef(0);
  const isMountedRef = useRef(true);

  const enqueueSend = (payload: Parameters<typeof agent.send>[0]) => {
    const epoch = sendEpochRef.current;
    const next = sendChainRef.current.then(() => {
      if (epoch !== sendEpochRef.current)
        throw isMountedRef.current ? sendCancelledError : sendAbandonedError;
      return agent.send(payload);
    });
    sendChainRef.current = next.catch(() => {});
    return next;
  };

  // The store outlives the component (useEveAgent holds it in a ref with no
  // cleanup), so queued sends must not fire server turns after unmount. The
  // flag separates that teardown from a user cancel, and is re-armed in setup
  // for a remounted tree.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      sendEpochRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (stagedInputsRef.current.size === 0) return;
    const baseIds = new Set(convertedMessages.map((message) => message.id));
    const remaining = messagesRef.current.filter(
      (message) =>
        stagedInputsRef.current.has(message.id) && !baseIds.has(message.id),
    );
    setStagedMessages(
      remaining.length > 0 ? [...convertedMessages, ...remaining] : null,
    );
  }, [convertedMessages]);

  const getStagedRun = (parentId: string | null) => {
    if (!parentId || !stagedInputsRef.current.has(parentId)) return null;
    const staged: {
      message: ThreadMessage;
      input: { message: AppendMessage; runConfig: AppendMessage["runConfig"] };
    }[] = [];
    for (const message of messagesRef.current) {
      const input = stagedInputsRef.current.get(message.id);
      if (input) staged.push({ message, input });
      if (message.id === parentId) break;
    }
    return staged;
  };

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
    const nextMessages = [...messagesRef.current, threadMessage];
    messagesRef.current = nextMessages;
    setStagedMessages(nextMessages);
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
      try {
        await enqueueSend({
          message: getEveMessageContent(message),
          ...toEveClientContext(message.runConfig),
        });
      } catch (error) {
        // A cancelled send never reached the session, so it rethrows for the
        // composer to take the draft back; an unmounted one has no composer
        // left to restore.
        if (error === sendAbandonedError) return;
        throw error;
      }
    },
    ...(stagedMessages
      ? {
          onReload: async (parentId: string | null, config) => {
            const stagedRun = getStagedRun(parentId);
            if (!stagedRun)
              throw new Error("Runtime does not support reloading messages.");
            const epoch = sendEpochRef.current;
            for (const { message: stagedMessage, input } of stagedRun) {
              if (epoch !== sendEpochRef.current) return;
              const previousMessages = messagesRef.current;
              stagedInputsRef.current.delete(stagedMessage.id);
              const nextMessages = previousMessages.filter(
                (message) => message.id !== stagedMessage.id,
              );
              messagesRef.current = nextMessages;
              setStagedMessages(
                stagedInputsRef.current.size > 0 ? nextMessages : null,
              );
              // The reload config belongs to the message being reloaded; the
              // drafts promoted ahead of it keep the config they were staged
              // with, or reloading the tail would rewrite their context too.
              const runConfig =
                stagedMessage.id === parentId && hasRunConfig(config.runConfig)
                  ? config.runConfig
                  : input.runConfig;
              try {
                await enqueueSend({
                  message: getEveMessageContent(input.message),
                  ...toEveClientContext(runConfig),
                });
              } catch (error) {
                stagedInputsRef.current.set(stagedMessage.id, input);
                messagesRef.current = previousMessages;
                setStagedMessages(previousMessages);
                if (isDroppedSend(error)) return;
                throw error;
              }
              if (lastFinishStatusRef.current === "error") return;
            }
          },
        }
      : {}),
    onCancel: () => {
      sendEpochRef.current += 1;
      agent.stop();
      return Promise.resolve();
    },
    onRespondToToolApproval: async (response) => {
      try {
        await enqueueSend({ inputResponses: [toEveInputResponse(response)] });
      } catch (error) {
        if (!isDroppedSend(error)) throw error;
      }
    },
  });
};

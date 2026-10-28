"use client";

import {
  useCallback,
  useEffect,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  useCloudThreadListAdapter,
  useExternalStoreRuntime,
  useRemoteThreadListRuntime,
  useRuntimeAdapters,
} from "@assistant-ui/core/react";
import { invokeUserCallback } from "@assistant-ui/core/internal";
import { useReplaySafeEffect } from "@assistant-ui/store/internal";
import { useAui } from "@assistant-ui/store";
import type { AssistantCloud } from "assistant-cloud";
import { useEveAgent, type UseEveAgentOptions } from "eve/react";
import { activeTurn, idle, type JsonObject } from "eve/events";
import type { Delivery } from "eve/sessions";
import {
  collectInterruptedTurnEvents,
  convertEveMessages,
  findEveInputRequest,
  getEveMessageContent,
  toEveInputResponse,
  type InterruptedTurnEventCache,
} from "./convertEveMessages";
import {
  collectTurnTimestamps,
  createTurnTimestampCache,
} from "./deriveCreatedAt";
import {
  createEveCloudSessions,
  type EveCloudSessions,
} from "./eveCloudSessions";
import { eveExtras } from "./eveExtras";
import { EVE_SDK } from "./sdkIdentity";

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

const hasRunConfig = (
  runConfig: AppendMessage["runConfig"],
): runConfig is NonNullable<AppendMessage["runConfig"]> =>
  runConfig?.custom !== undefined && Object.keys(runConfig.custom).length > 0;

const toEveSendOptions = (
  runConfig: AppendMessage["runConfig"],
): { readonly clientContext: JsonObject } | undefined =>
  hasRunConfig(runConfig)
    ? { clientContext: runConfig.custom as JsonObject }
    : undefined;

export type UseEveAgentRuntimeOptions = UseEveAgentOptions &
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
    readonly cloud?: AssistantCloud | undefined;
  };

type EveCloudThread = {
  readonly sessions: EveCloudSessions;
  readonly id: string;
  readonly isNew: boolean;
  readonly sessionId: string | undefined;
};

const withCloudThreadSession = (
  {
    initialEvents: _initialEvents,
    initialSession: _initialSession,
    resume: _resume,
    session: _session,
    ...options
  }: UseEveAgentOptions,
  sessionId: string | undefined,
): UseEveAgentOptions =>
  sessionId === undefined
    ? options
    : {
        ...options,
        initialSession: { sessionId, streamIndex: 0 },
        resume: true,
      };

const useEveThreadRuntime = (
  options: UseEveAgentRuntimeOptions,
  cloudSessions: EveCloudSessions | undefined,
) => {
  const {
    adapters,
    cloud: _cloud,
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

  const aui = useAui();
  const [cloudThread] = useState((): EveCloudThread | undefined => {
    if (!cloudSessions) return undefined;
    const { id, status, externalId } = aui.threadListItem.getState();
    return {
      sessions: cloudSessions,
      id,
      isNew: status === "new",
      sessionId: externalId,
    };
  });
  const [resumesOnMount] = useState(() =>
    cloudThread
      ? cloudThread.sessionId !== undefined
      : agentOptions.resume === true,
  );
  const isSessionless =
    cloudThread !== undefined &&
    !cloudThread.isNew &&
    cloudThread.sessionId === undefined;

  const { onError, onEvent, onFinish, onSessionChange } = agentOptions;
  const agent = useEveAgent({
    ...(cloudThread
      ? withCloudThreadSession(agentOptions, cloudThread.sessionId)
      : agentOptions),
    ...(onError
      ? {
          onError: (error) =>
            void invokeUserCallback(
              "assistant-ui/eve",
              "onError",
              onError,
              error,
            ),
        }
      : {}),
    ...(onEvent
      ? {
          onEvent: (event) =>
            void invokeUserCallback(
              "assistant-ui/eve",
              "onEvent",
              onEvent,
              event,
            ),
        }
      : {}),
    onFinish: (snapshot) => {
      void invokeUserCallback(
        "assistant-ui/eve",
        "onFinish",
        onFinish,
        snapshot,
      );
    },
    ...(onSessionChange || cloudThread?.isNew
      ? {
          onSessionChange: (session) => {
            if (cloudThread?.isNew && session === undefined) {
              cloudThread.sessions.reject(
                cloudThread.id,
                new Error("The eve turn ended before it created a session."),
              );
            } else if (cloudThread?.isNew && session !== undefined) {
              cloudThread.sessions.resolve(cloudThread.id, session.sessionId);
              if (aui.threadListItem.getState().status === "new")
                aui.threadListItem.initialize().catch(() => {});
            }
            void invokeUserCallback(
              "assistant-ui/eve",
              "onSessionChange",
              onSessionChange,
              session,
            );
          },
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
  const providerIsRunning =
    agent.status === "busy" ||
    (agent.status !== "resuming" &&
      activeTurn(agent.view) !== undefined &&
      !idle(agent.view));
  const isRunning = providerIsRunning || hasExecutingTools;
  const turnTimestampCacheRef = useRef(createTurnTimestampCache());
  const turnTimestamps = useMemo(
    () => collectTurnTimestamps(agent.events, turnTimestampCacheRef.current),
    [agent.events],
  );
  const interruptionCacheRef = useRef<InterruptedTurnEventCache>({
    lastEvents: [],
    interruptions: [],
  });
  const interruptionEvents = useMemo(
    () =>
      collectInterruptedTurnEvents(agent.events, interruptionCacheRef.current),
    [agent.events],
  );

  const convertedMessages = useMemo(() => {
    const createdAtByMessageId = createdAtByMessageIdRef.current;
    const messageIds = new Set(agent.messages.map((message) => message.id));
    for (const messageId of createdAtByMessageId.keys()) {
      if (!messageIds.has(messageId)) createdAtByMessageId.delete(messageId);
    }

    return convertEveMessages(
      { messages: agent.messages },
      {
        isRunning,
        error: agent.error,
        events: interruptionEvents,
        getCreatedAt: (message) => {
          const turnId = message.metadata?.turnId;
          const durable =
            turnId === undefined
              ? undefined
              : turnTimestamps.get(turnId)?.[message.role];
          if (durable !== undefined) return durable;

          const existing = createdAtByMessageId.get(message.id);
          if (existing) return existing;

          const createdAt = new Date();
          createdAtByMessageId.set(message.id, createdAt);
          return createdAt;
        },
      },
    );
  }, [
    agent.messages,
    agent.error,
    interruptionEvents,
    isRunning,
    turnTimestamps,
  ]);

  const messages = stagedMessages ?? convertedMessages;
  const messagesRef = useRef(messages);
  const agentRef = useRef(agent);
  useInsertionEffect(() => {
    messagesRef.current = messages;
    agentRef.current = agent;
  }, [agent, messages]);
  const deliveryReadsRef = useRef(new AbortController());
  const lastDeliveryFailedRef = useRef(false);
  const sendChainRef = useRef<Promise<void>>(Promise.resolve());
  const sendEpochRef = useRef(0);
  const resetEpochRef = useRef(0);
  const isMountedRef = useRef(true);
  const runtimeRef = useRef<ReturnType<typeof useExternalStoreRuntime> | null>(
    null,
  );

  const settleDelivery = async (pending: Promise<Delivery>) => {
    const signal = deliveryReadsRef.current.signal;
    const receipt = await pending;
    try {
      const result = await receipt.result({ signal });
      if (!signal.aborted) {
        lastDeliveryFailedRef.current = result.status === "failed";
      }
    } catch (error) {
      if (signal.aborted) {
        throw isMountedRef.current ? sendCancelledError : sendAbandonedError;
      }
      throw error;
    }
  };

  const enqueueSend = useCallback(
    (
      dispatch: () => Promise<void>,
      epochRef: { current: number } = sendEpochRef,
    ) => {
      const epoch = epochRef.current;
      const next = sendChainRef.current.then(() => {
        if (!isMountedRef.current) throw sendAbandonedError;
        if (epoch !== epochRef.current) throw sendCancelledError;
        return dispatch();
      });
      sendChainRef.current = next.catch(() => {});
      return next;
    },
    [],
  );
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  useReplaySafeEffect(
    () => () => {
      sendEpochRef.current += 1;
      deliveryReadsRef.current.abort();
    },
    [],
  );
  const enqueueResume = useCallback(
    () =>
      enqueueSend(async () => {
        const live = agentRef.current;
        if (live.session === undefined) return;
        await live.resume();
      }, resetEpochRef),
    [enqueueSend],
  );

  useEffect(() => {
    if (!resumesOnMount) return;
    let active = true;
    queueMicrotask(() => {
      if (active) enqueueResume().catch(() => {});
    });
    return () => {
      active = false;
    };
  }, [enqueueResume, resumesOnMount]);

  useReplaySafeEffect(() => {
    if (!cloudThread?.isNew) return;
    return () => cloudThread.sessions.release(cloudThread.id);
  }, [cloudThread]);

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

  const reset = useCallback(() => {
    if (cloudThread) {
      aui.threads.switchToNewThread();
      return;
    }
    runtimeRef.current?.thread.unstable_notifySessionReset();
    sendEpochRef.current += 1;
    resetEpochRef.current += 1;
    lastDeliveryFailedRef.current = false;
    deliveryReadsRef.current.abort();
    deliveryReadsRef.current = new AbortController();
    sendChainRef.current = Promise.resolve();
    setStagedMessages(null);
    stagedInputsRef.current.clear();
    setToolStatuses({});
    agent.newSession();
  }, [agent, aui, cloudThread]);

  const extras = useMemo(
    () =>
      eveExtras.provide({
        error: agent.error,
        events: agent.events,
        session: agent.session,
        reset,
      }),
    [agent.error, agent.events, agent.session, reset],
  );

  const runtime = useExternalStoreRuntime({
    ...pickExternalStoreSharedOptions(options),
    messages,
    isRunning: providerIsRunning,
    isLoading: agent.status === "resuming",
    extras,
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
      if (isSessionless)
        throw new MessageNotSentError(
          "This thread has no eve session to send to.",
        );
      if (!(message.startRun ?? message.role === "user")) {
        if (cloudThread?.isNew)
          cloudThread.sessions.reject(
            cloudThread.id,
            new Error("The thread's first message was staged without a run."),
          );
        stageUserMessage(message);
        return;
      }
      try {
        await enqueueSend(() =>
          settleDelivery(
            agent.send(
              getEveMessageContent(message),
              toEveSendOptions(message.runConfig),
            ),
          ),
        );
      } catch (error) {
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
            const resetEpoch = resetEpochRef.current;
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
              const runConfig =
                stagedMessage.id === parentId && hasRunConfig(config.runConfig)
                  ? config.runConfig
                  : input.runConfig;
              try {
                await enqueueSend(() =>
                  settleDelivery(
                    agent.send(
                      getEveMessageContent(input.message),
                      toEveSendOptions(runConfig),
                    ),
                  ),
                );
              } catch (error) {
                if (resetEpoch !== resetEpochRef.current) return;
                stagedInputsRef.current.set(stagedMessage.id, input);
                messagesRef.current = previousMessages;
                setStagedMessages(previousMessages);
                if (isDroppedSend(error)) return;
                throw error;
              }
              if (lastDeliveryFailedRef.current) return;
            }
          },
        }
      : {}),
    onCancel: async () => {
      sendEpochRef.current += 1;
      await agent.cancel();
    },
    onRefetchThread: () =>
      enqueueResume().catch((error) => {
        if (isDroppedSend(error)) return;
        throw error;
      }),
    onRespondToToolApproval: (response) => {
      const answer = toEveInputResponse(
        response,
        findEveInputRequest(agent, response.approvalId),
      );
      return enqueueSend(() => settleDelivery(agent.respond([answer]))).catch(
        (error) => {
          if (!isDroppedSend(error)) throw error;
        },
      );
    },
  });
  runtimeRef.current = runtime;

  return runtime;
};

const useEveCloudRuntime = (
  cloud: AssistantCloud,
  options: UseEveAgentRuntimeOptions,
) => {
  const [sessions] = useState(createEveCloudSessions);
  const adapter = useCloudThreadListAdapter({
    cloud,
    sdk: EVE_SDK,
    upsert: true,
    create: async (threadId) => ({ externalId: await sessions.wait(threadId) }),
  });
  return useRemoteThreadListRuntime({
    adapter,
    allowNesting: true,
    runtimeHook: function RuntimeHook() {
      return useEveThreadRuntime(options, sessions);
    },
  });
};

export const useEveAgentRuntime = (options: UseEveAgentRuntimeOptions = {}) => {
  const [hasCloud] = useState(options.cloud !== undefined);
  if ((options.cloud !== undefined) !== hasCloud) {
    throw new Error(
      "useEveAgentRuntime cannot add or remove `cloud` after it mounts; remount it, for example with a `key`, to switch.",
    );
  }
  if (!options.cloud) {
    // oxlint-disable-next-line react-hooks/rules-of-hooks -- `cloud` stays set or unset for the runtime's lifetime, so every render takes the same branch
    return useEveThreadRuntime(options, undefined);
  }
  // oxlint-disable-next-line react-hooks/rules-of-hooks -- `cloud` stays set or unset for the runtime's lifetime, so every render takes the same branch
  return useEveCloudRuntime(options.cloud, options);
};

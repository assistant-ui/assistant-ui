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
import { useAui } from "@assistant-ui/store";
import type { AssistantCloud } from "assistant-cloud";
import {
  useEveAgent,
  type EveMessageData,
  type UseEveAgentOptions,
  type UseEveAgentStatus,
} from "eve/react";
import {
  convertEveMessages,
  findEveInputRequest,
  getEveMessageContent,
  toEveInputResponse,
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

type EveJsonValue =
  | string
  | number
  | boolean
  | null
  | readonly EveJsonValue[]
  | { readonly [key: string]: EveJsonValue };

/**
 * Structural equivalent of eve's `JsonObject`. Eve demoted its public send
 * payload type once already (`SendTurnPayload`, public through 0.30, internal
 * from 0.31), so the helpers declare the shapes they forward instead of
 * re-exporting eve's option types, and assignability is checked at the send
 * call sites against the installed version.
 */
type EveClientContext = { readonly [key: string]: EveJsonValue };

/**
 * Only the `custom` bag crosses the wire. Eve reads `clientContext` as its own
 * namespace and serializes it into a model-visible context message, so sending
 * the assistant-ui envelope would surface a literal `"custom"` key in the
 * prompt and to every eve-side handler.
 */
const toEveSendOptions = (
  runConfig: AppendMessage["runConfig"],
): { readonly clientContext: EveClientContext } | undefined =>
  hasRunConfig(runConfig)
    ? { clientContext: runConfig.custom as EveClientContext }
    : undefined;

type EveAgentOptions = Omit<UseEveAgentOptions<EveMessageData>, "reducer">;

export type UseEveAgentRuntimeOptions = EveAgentOptions &
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
    /**
     * Backs the thread list with Assistant Cloud. Each cloud thread keeps one Eve session as its external id, saved once the thread's first turn creates the session, and opening a thread resumes it, so `session`, `initialSession`, `initialEvents`, and `resume` are not used. Pass it from the first render: adding or removing it needs a remount.
     */
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
  }: EveAgentOptions,
  sessionId: string | undefined,
): EveAgentOptions =>
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
  const lastFinishStatusRef = useRef<UseEveAgentStatus | null>(null);
  const agent = useEveAgent({
    ...(cloudThread
      ? withCloudThreadSession(agentOptions, cloudThread.sessionId)
      : agentOptions),
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
              // A first message staged without a run leaves the thread unsaved, so the run that creates the session saves it.
              if (aui.threadListItem.getState().status === "new")
                aui.threadListItem.initialize().catch(() => {});
            }
            invokeEveLifecycleCallback(
              "onSessionChange",
              onSessionChange,
              session,
            );
          },
        }
      : {}),
  });
  if (cloudThread && !("resume" in agent)) {
    throw new Error(
      "useEveAgentRuntime needs eve 0.44.1 or later for `cloud`, because opening a cloud thread resumes its session.",
    );
  }
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
    agent.status === "submitted" || agent.status === "streaming";
  const isRunning = providerIsRunning || hasExecutingTools;

  // Kept apart from the message memo so events that teach no timestamp keep
  // the map identity and skip rebuilding every ThreadMessage.
  const turnTimestampCacheRef = useRef(createTurnTimestampCache());
  const turnTimestamps = useMemo(
    () => collectTurnTimestamps(agent.events, turnTimestampCacheRef.current),
    [agent.events],
  );

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
    });
  }, [agent.data, agent.error, isRunning, turnTimestamps]);

  const messages = stagedMessages ?? convertedMessages;
  const messagesRef = useRef(messages);
  const agentRef = useRef(agent);
  // Descendant layout effects can dispatch against these refs synchronously;
  // this matches useA2ARuntime's commit-scoped ref publication.
  useInsertionEffect(() => {
    messagesRef.current = messages;
    agentRef.current = agent;
  }, [agent, messages]);

  // Upstream `EveAgentStore` `send` and `respond` reject while a turn is in
  // flight and only resolve once the turn's stream parks, so a pending chain
  // link is exactly an active turn; chaining every dispatch serializes them
  // without watching status.
  const sendChainRef = useRef<Promise<void>>(Promise.resolve());
  const sendEpochRef = useRef(0);
  // A cancel drops the queued send but keeps its draft for a later promotion;
  // only a reset discards the draft with the session, so the two need separate
  // counters. A queued read has no draft and outlives a cancel, so it waits on
  // the reset counter instead.
  const resetEpochRef = useRef(0);
  const isMountedRef = useRef(true);
  const runtimeRef = useRef<ReturnType<typeof useExternalStoreRuntime> | null>(
    null,
  );

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

  // A replay rides the send chain because `resume()` rejects during a turn and upstream refuses sends while it runs; the reset counter keeps a cancel from dropping a refetch, and the hook's own replay on mount joins this one since upstream shares concurrent `resume()` calls.
  const enqueueResume = useCallback(
    () =>
      enqueueSend(async () => {
        const live = agentRef.current;
        if (live.session === undefined || !("resume" in live)) return;
        await live.resume();
      }, resetEpochRef),
    [enqueueSend],
  );

  useEffect(() => {
    if (!resumesOnMount) return;
    // StrictMode's second setup queues the replay again, so only the setup that survives queues it.
    let active = true;
    queueMicrotask(() => {
      if (active) enqueueResume().catch(() => {});
    });
    return () => {
      active = false;
    };
  }, [enqueueResume, resumesOnMount]);

  useEffect(() => {
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
    // A cloud thread keeps the session its external id names, so a fresh session starts a new thread and leaves this one in the list.
    if (cloudThread) {
      aui.threads.switchToNewThread();
      return;
    }
    runtimeRef.current?.thread.unstable_notifySessionReset();
    // Sends parked behind an active turn captured the pre-reset epoch, so the
    // epoch has to advance before the session is torn down or they dispatch
    // into the new one; `lastFinishStatusRef` is run-scoped for the same
    // reason.
    sendEpochRef.current += 1;
    resetEpochRef.current += 1;
    lastFinishStatusRef.current = null;
    setStagedMessages(null);
    stagedInputsRef.current.clear();
    setToolStatuses({});
    agent.reset();
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
        // Saving a new cloud thread waits for its first session, which a staged message never creates.
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
          agent.send(
            getEveMessageContent(message),
            toEveSendOptions(message.runConfig),
          ),
        );
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
              // The reload config belongs to the message being reloaded; the
              // drafts promoted ahead of it keep the config they were staged
              // with, or reloading the tail would rewrite their context too.
              const runConfig =
                stagedMessage.id === parentId && hasRunConfig(config.runConfig)
                  ? config.runConfig
                  : input.runConfig;
              try {
                await enqueueSend(() =>
                  agent.send(
                    getEveMessageContent(input.message),
                    toEveSendOptions(runConfig),
                  ),
                );
              } catch (error) {
                // A reset discarded the draft along with the session, so
                // restoring it here would refloat a message the thread no
                // longer has. A cancel still restores.
                if (resetEpoch !== resetEpochRef.current) return;
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
    onCancel: async () => {
      sendEpochRef.current += 1;
      // Eve 0.38 replaced the binding's local-abort `stop()` with the durable
      // `cancel()`, so the adapter detects which side of that break the host's
      // eve provides instead of pinning the peer range to one of them.
      const controls = agent as
        | { readonly cancel: () => Promise<unknown> }
        | { readonly stop: () => void };
      if ("cancel" in controls) {
        await controls.cancel();
      } else {
        controls.stop();
      }
    },
    // Hosts below eve 0.44.1 expose no `resume`; leaving the capability absent
    // keeps `threads.reloadMainThread()` on core's no-capability no-op.
    ...("resume" in agent
      ? {
          onRefetchThread: () =>
            enqueueResume().catch((error) => {
              if (isDroppedSend(error)) return;
              throw error;
            }),
        }
      : {}),
    onRespondToToolApproval: (response) => {
      // Eve resolves a request the moment any response for it arrives, and an
      // empty one is recorded as an answer with no content. Mapping before the
      // send is enqueued keeps an unmappable response unsent, so the request
      // stays answerable; the mapper's error reaches the caller as the seam's
      // rejection.
      const inputResponse = toEveInputResponse(
        response,
        findEveInputRequest(agent.data, response.approvalId),
      );
      return enqueueSend(() => agent.respond([inputResponse])).catch(
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

/**
 * Connects Eve's `useEveAgent` hook to assistant-ui's runtime contract.
 *
 * The runtime renders Eve messages, forwards new user messages to the Eve
 * session, supports cancellation, and maps Eve input requests to assistant-ui
 * tool approval UI.
 */
export const useEveAgentRuntime = (options: UseEveAgentRuntimeOptions = {}) => {
  if (!options.cloud) {
    // oxlint-disable-next-line react-hooks/rules-of-hooks -- `cloud` stays set or unset for the runtime's lifetime, so every render takes the same branch
    return useEveThreadRuntime(options, undefined);
  }
  // oxlint-disable-next-line react-hooks/rules-of-hooks -- `cloud` stays set or unset for the runtime's lifetime, so every render takes the same branch
  return useEveCloudRuntime(options.cloud, options);
};

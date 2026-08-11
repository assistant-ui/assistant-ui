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
import type { HandleMessageStreamEvent, SendTurnPayload } from "eve/client";
import {
  convertEveMessages,
  getEveMessageContent,
  toEveInputResponse,
} from "./convertEveMessages";

const USER_STAGED_STATUS = {
  type: "complete",
  reason: "unknown",
} as const;

// A turn carries both of its messages, so each role takes the earliest event
// that belongs to it rather than the turn's first event: `message.received`
// stamps the user message, and the first event after it stamps the assistant
// message. Collapsing both onto the turn's start would render a reply that
// arrived after minutes of tool calls at the time the question was asked.
type TurnTimestamps = {
  turn: Date;
  user?: Date;
  assistant?: Date;
};

type TurnTimestampCache = {
  lastEvents: readonly HandleMessageStreamEvent[];
  timestamps: ReadonlyMap<string, TurnTimestamps>;
};

const EMPTY_TURN_TIMESTAMPS: ReadonlyMap<string, TurnTimestamps> = new Map();

// A turn whose event window no longer reaches its own role-specific events
// still resolves through the turn's earliest event, and an assistant message
// never resolves earlier than its user message.
const resolveTurnTimestamp = (
  stamps: TurnTimestamps | undefined,
  role: string,
): Date | undefined => {
  if (stamps === undefined) return undefined;
  if (role === "user") return stamps.user ?? stamps.turn;
  return stamps.assistant ?? stamps.user ?? stamps.turn;
};

type AssignedCreatedAt = { at: Date; durable: boolean };

// Eve grows its event log via [...events, event], so a later snapshot shares
// its prefix by reference and the scan can resume where it left off. The reuse
// is validated rather than trusted, because the cache may hold state from a
// discarded render. The whole prefix is compared: a boundary-only check accepts
// a snapshot that replaced an earlier event while keeping a later one, and the
// timestamp derived from the replaced event would survive unscanned.
//
// The map is copied on write and returned by identity, so a scan that learns
// nothing new lets callers keep memoized work alive.
const collectTurnTimestamps = (
  events: readonly HandleMessageStreamEvent[],
  cache: TurnTimestampCache,
): ReadonlyMap<string, TurnTimestamps> => {
  if (events === cache.lastEvents) return cache.timestamps;

  const scanned = cache.lastEvents;
  const prefixIntact =
    events.length >= scanned.length &&
    scanned.every((event, index) => event === events[index]);

  let timestamps = prefixIntact ? cache.timestamps : EMPTY_TURN_TIMESTAMPS;
  let draft: Map<string, TurnTimestamps> | undefined;
  for (let i = prefixIntact ? scanned.length : 0; i < events.length; i++) {
    const event = events[i]!;
    const at = event.meta?.at;
    if (at === undefined) continue;
    if (!("data" in event)) continue;
    if (!("turnId" in event.data) || typeof event.data.turnId !== "string")
      continue;
    const turnId = event.data.turnId;
    const known = timestamps.get(turnId);
    const isReceived = event.type === "message.received";
    const wantsUser = isReceived && known?.user === undefined;
    const wantsAssistant =
      !isReceived && known?.user !== undefined && known.assistant === undefined;
    if (known !== undefined && !wantsUser && !wantsAssistant) continue;
    const date = new Date(at);
    if (Number.isNaN(date.getTime())) continue;
    const next: TurnTimestamps = { ...(known ?? { turn: date }) };
    if (wantsUser) next.user = date;
    if (wantsAssistant) next.assistant = date;
    draft ??= new Map(timestamps);
    draft.set(turnId, next);
    timestamps = draft;
  }

  cache.lastEvents = events;
  cache.timestamps = timestamps;
  return timestamps;
};

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
  const createdAtByMessageIdRef = useRef(new Map<string, AssignedCreatedAt>());
  const turnTimestampCacheRef = useRef<TurnTimestampCache>({
    lastEvents: [],
    timestamps: EMPTY_TURN_TIMESTAMPS,
  });
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

  // Most events leave the turn timestamps untouched, and the message list memo
  // below reallocates every ThreadMessage when it recomputes. Keeping the scan
  // in its own memo confines that cost to the events that actually change a
  // timestamp.
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

    // Durable timestamps are ground truth and are never adjusted. Fallback
    // wall-clock stamps can run ahead of durable ones (a server clock behind
    // the client's), so each fallback is bounded between its neighboring
    // assigned/durable timestamps to keep message order and thread timestamps
    // consistent. The bounds are the tightest ones the thread order proves, so
    // a fallback with no durable predecessor renders at its successor's durable
    // stamp: an upper bound the message is no newer than, not a claim about
    // when it was sent. Leaving it unbounded means core's plain `new Date()`,
    // which renders resumed history as "just now" and orders it after the
    // durable message that follows it.
    //
    // A durable timestamp already observed for a still-present message outlives
    // the event that carried it: the event log can be replaced by one that no
    // longer reaches back to that turn (a resumed or compacted session), and
    // re-deriving from the new log alone would drop the message to a fresh
    // wall-clock stamp and render an old message as "just now".
    const eveMessages = agent.data.messages;
    const durableByIndex = eveMessages.map((message) => {
      const turnId = message.metadata?.turnId;
      const derived =
        turnId !== undefined
          ? resolveTurnTimestamp(turnTimestamps.get(turnId), message.role)
          : undefined;
      if (derived !== undefined) {
        createdAtByMessageId.set(message.id, { at: derived, durable: true });
        return derived;
      }
      const remembered = createdAtByMessageId.get(message.id);
      return remembered?.durable === true ? remembered.at : undefined;
    });
    const nextDurableMsByIndex: (number | undefined)[] = [];
    let nextDurableMs: number | undefined;
    for (let i = eveMessages.length - 1; i >= 0; i--) {
      nextDurableMsByIndex[i] = nextDurableMs;
      const durable = durableByIndex[i];
      if (durable !== undefined) nextDurableMs = durable.getTime();
    }

    const assignedById = new Map<string, Date>();
    let previousAssignedMs: number | undefined;
    eveMessages.forEach((message, index) => {
      let assigned = durableByIndex[index];
      if (assigned === undefined) {
        let fallback = createdAtByMessageId.get(message.id)?.at;
        if (fallback === undefined) {
          fallback = new Date();
          createdAtByMessageId.set(message.id, {
            at: fallback,
            durable: false,
          });
        }
        let ms = fallback.getTime();
        if (previousAssignedMs !== undefined && ms < previousAssignedMs)
          ms = previousAssignedMs;
        const nextMs = nextDurableMsByIndex[index];
        if (nextMs !== undefined && ms > nextMs) ms = nextMs;
        assigned = ms === fallback.getTime() ? fallback : new Date(ms);
      }
      previousAssignedMs = assigned.getTime();
      assignedById.set(message.id, assigned);
    });

    return convertEveMessages(agent.data, {
      isRunning,
      error: agent.error,
      getCreatedAt: (message) => assignedById.get(message.id) ?? new Date(),
    });
  }, [agent.data, agent.error, isRunning, turnTimestamps]);

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

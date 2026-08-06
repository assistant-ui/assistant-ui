"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type TurnTimestampCache = {
  lastEvents: readonly HandleMessageStreamEvent[];
  timestamps: ReadonlyMap<string, Date>;
};

const EMPTY_TURN_TIMESTAMPS: ReadonlyMap<string, Date> = new Map();

type AssignedCreatedAt = { at: Date; durable: boolean };

// Eve's store grows its event log via [...events, event], so a later snapshot
// shares its prefix elements by reference and the cache can resume where it
// left off. The reuse is validated, never trusted: the cache may hold state
// from a discarded render, so every previously scanned element must still be
// identical at the same index. A boundary-only check would accept a snapshot
// that replaced an earlier event while keeping a later one, and the timestamp
// derived from the replaced event would survive unscanned. The comparison is
// reference equality over an already-materialized array, so it costs far less
// than re-deriving the timestamps it protects.
//
// The map is copied on write and returned by identity, so a scan that learns
// nothing new lets callers keep memoized work alive.
const collectTurnTimestamps = (
  events: readonly HandleMessageStreamEvent[],
  cache: TurnTimestampCache,
): ReadonlyMap<string, Date> => {
  if (events === cache.lastEvents) return cache.timestamps;

  const scanned = cache.lastEvents;
  const prefixIntact =
    events.length >= scanned.length &&
    scanned.every((event, index) => event === events[index]);

  let timestamps = prefixIntact ? cache.timestamps : EMPTY_TURN_TIMESTAMPS;
  let draft: Map<string, Date> | undefined;
  for (let i = prefixIntact ? scanned.length : 0; i < events.length; i++) {
    const event = events[i]!;
    const at = event.meta?.at;
    if (at === undefined) continue;
    if (!("data" in event)) continue;
    if (!("turnId" in event.data) || typeof event.data.turnId !== "string")
      continue;
    if (timestamps.has(event.data.turnId)) continue;
    const date = new Date(at);
    if (Number.isNaN(date.getTime())) continue;
    draft ??= new Map(timestamps);
    draft.set(event.data.turnId, date);
    timestamps = draft;
  }

  cache.lastEvents = events;
  cache.timestamps = timestamps;
  return timestamps;
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

  const agent = useEveAgent(agentOptions);
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
    // consistent.
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
        turnId !== undefined ? turnTimestamps.get(turnId) : undefined;
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
      await agent.send({
        message: getEveMessageContent(message),
        ...toEveClientContext(message.runConfig),
      });
    },
    ...(stagedMessages
      ? {
          onReload: async (parentId: string | null, config) => {
            const stagedRun = getStagedRun(parentId);
            if (!stagedRun)
              throw new Error("Runtime does not support reloading messages.");
            for (const { message: stagedMessage, input } of stagedRun) {
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
                await agent.send({
                  message: getEveMessageContent(input.message),
                  ...toEveClientContext(runConfig),
                });
              } catch (error) {
                stagedInputsRef.current.set(stagedMessage.id, input);
                messagesRef.current = previousMessages;
                setStagedMessages(previousMessages);
                throw error;
              }
            }
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

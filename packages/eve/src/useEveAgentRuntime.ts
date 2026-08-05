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
import type { HandleMessageStreamEvent } from "eve/client";
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
  lastLength: number;
  timestamps: Map<string, Date>;
};

// Eve's store grows its event log via [...events, event], so a later snapshot
// shares its prefix elements by reference and the cache can resume where it
// left off. The reuse is validated, never trusted: the cache may hold state
// from a discarded render, so the incremental path requires the last
// previously scanned element to be identical — a reset() that regrew past the
// cached length fails that check and triggers a full rescan.
const collectTurnTimestamps = (
  events: readonly HandleMessageStreamEvent[],
  cache: TurnTimestampCache,
): ReadonlyMap<string, Date> => {
  const prefixIntact =
    events.length >= cache.lastLength &&
    (cache.lastLength === 0 ||
      events[cache.lastLength - 1] === cache.lastEvents[cache.lastLength - 1]);
  if (!prefixIntact) {
    cache.lastLength = 0;
    cache.timestamps = new Map();
  }
  for (let i = cache.lastLength; i < events.length; i++) {
    const event = events[i]!;
    const at = event.meta?.at;
    if (at === undefined) continue;
    if (!("data" in event)) continue;
    if (!("turnId" in event.data) || typeof event.data.turnId !== "string")
      continue;
    if (cache.timestamps.has(event.data.turnId)) continue;
    const date = new Date(at);
    if (!Number.isNaN(date.getTime()))
      cache.timestamps.set(event.data.turnId, date);
  }
  cache.lastEvents = events;
  cache.lastLength = events.length;
  return cache.timestamps;
};

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
  const turnTimestampCacheRef = useRef<TurnTimestampCache>({
    lastEvents: [],
    lastLength: 0,
    timestamps: new Map(),
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

  const convertedMessages = useMemo(() => {
    const createdAtByMessageId = createdAtByMessageIdRef.current;
    const messageIds = new Set(
      agent.data.messages.map((message) => message.id),
    );
    for (const messageId of createdAtByMessageId.keys()) {
      if (!messageIds.has(messageId)) createdAtByMessageId.delete(messageId);
    }

    const turnTimestamps = collectTurnTimestamps(
      agent.events,
      turnTimestampCacheRef.current,
    );

    // Durable timestamps are ground truth and are never adjusted. Fallback
    // wall-clock stamps can run ahead of durable ones (a server clock behind
    // the client's), so each fallback is bounded between its neighboring
    // assigned/durable timestamps to keep message order and thread timestamps
    // consistent.
    const eveMessages = agent.data.messages;
    const durableByIndex = eveMessages.map((message) => {
      const turnId = message.metadata?.turnId;
      return turnId !== undefined ? turnTimestamps.get(turnId) : undefined;
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
        let fallback = createdAtByMessageId.get(message.id);
        if (fallback === undefined) {
          fallback = new Date();
          createdAtByMessageId.set(message.id, fallback);
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
  }, [agent.data, agent.error, agent.events, isRunning]);

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
      await agent.send({ message: getEveMessageContent(message) });
    },
    ...(stagedMessages
      ? {
          onReload: async (parentId: string | null) => {
            const staged = parentId
              ? stagedInputsRef.current.get(parentId)
              : null;
            if (!staged)
              throw new Error("Runtime does not support reloading messages.");
            stagedInputsRef.current.delete(parentId!);
            setStagedMessages(null);
            await agent.send({ message: getEveMessageContent(staged.message) });
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

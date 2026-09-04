import {
  useState,
  useCallback,
  useEffect,
  useInsertionEffect,
  useRef,
  useMemo,
} from "react";
import { generateId } from "@assistant-ui/core";
import { useAui } from "@assistant-ui/store";
import { invokeUserCallback } from "@assistant-ui/core/internal";
import { AdkEventAccumulator } from "./AdkEventAccumulator";
import { contentToParts } from "./contentToParts";
import type {
  AdkEvent,
  AdkMessage,
  AdkMessageMetadata,
  AdkSendMessageConfig,
  AdkStreamCallback,
  AdkToolConfirmation,
  AdkAuthRequest,
  AdkThreadSnapshot,
  OnAdkErrorCallback,
  OnAdkCustomEventCallback,
  OnAdkAgentTransferCallback,
} from "./types";

export type UseAdkMessagesOptions = {
  stream: AdkStreamCallback;
  eventHandlers?: {
    onError?: OnAdkErrorCallback;
    onCustomEvent?: OnAdkCustomEventCallback;
    onAgentTransfer?: OnAdkAgentTransferCallback;
  };
};

type AdkRuntimeCallbackName = "onError" | "onCustomEvent" | "onAgentTransfer";

const invokeAdkRuntimeCallback = <TArgs extends readonly unknown[]>(
  name: AdkRuntimeCallbackName,
  callback: ((...args: TArgs) => unknown) | undefined,
  ...args: TArgs
): void => {
  void invokeUserCallback("react-google-adk", name, callback, ...args);
};

export const useAdkMessages = ({
  stream,
  eventHandlers,
}: UseAdkMessagesOptions) => {
  const [messages, _setMessages] = useState<AdkMessage[]>([]);
  const [stateDelta, setStateDelta] = useState<Record<string, unknown>>({});
  const [agentInfo, setAgentInfo] = useState<{
    name?: string | undefined;
    branch?: string | undefined;
  }>({});
  const [longRunningToolIds, setLongRunningToolIds] = useState<string[]>([]);
  const [artifactDelta, setArtifactDelta] = useState<Record<string, number>>(
    {},
  );
  const [toolConfirmations, setToolConfirmations] = useState<
    AdkToolConfirmation[]
  >([]);
  const [authRequests, setAuthRequests] = useState<AdkAuthRequest[]>([]);
  const [escalated, setEscalated] = useState(false);
  const [messageMetadata, setMessageMetadata] = useState<
    Map<string, AdkMessageMetadata>
  >(new Map());
  const lastTransferToAgentRef = useRef<string | undefined>(undefined);
  // setMessagesImmediate is the only writer of the messages state and publishes
  // this ref with it, so the ref never trails a commit.
  const messagesRef = useRef(messages);
  const stateDeltaRef = useRef(stateDelta);
  useInsertionEffect(() => {
    stateDeltaRef.current = stateDelta;
  }, [stateDelta]);
  const artifactDeltaRef = useRef(artifactDelta);
  useInsertionEffect(() => {
    artifactDeltaRef.current = artifactDelta;
  }, [artifactDelta]);
  const messageMetadataRef = useRef(messageMetadata);
  useInsertionEffect(() => {
    messageMetadataRef.current = messageMetadata;
  }, [messageMetadata]);

  const setMessagesImmediate = useCallback((msgs: AdkMessage[]) => {
    messagesRef.current = msgs;
    _setMessages(msgs);
  }, []);

  /**
   * Swap the thread over to a loaded snapshot in one commit. Unlike
   * {@link replaceMessages} this never passes through a cleared state, so a
   * refetch that lands while a confirmation is on screen replaces it rather
   * than blanking it first.
   */
  const applySnapshot = useCallback(
    (snapshot: AdkThreadSnapshot) => {
      setMessagesImmediate(snapshot.messages);
      setLongRunningToolIds(snapshot.longRunningToolIds ?? []);
      setToolConfirmations(snapshot.toolConfirmations ?? []);
      setAuthRequests(snapshot.authRequests ?? []);
      setEscalated(snapshot.escalated ?? false);
      setMessageMetadata(snapshot.messageMetadata ?? new Map());
      setStateDelta(snapshot.stateDelta ?? {});
      setArtifactDelta(snapshot.artifactDelta ?? {});
      setAgentInfo(snapshot.agentInfo ?? {});
    },
    [setMessagesImmediate],
  );

  // Replace the message list AND reset derived per-turn HITL state.
  // Used by truncation paths (edit, reload) so that stale interrupt
  // markers and per-message metadata from the removed messages don't leak
  // into the next turn.
  const replaceMessages = useCallback(
    (msgs: AdkMessage[]) => {
      setMessagesImmediate(msgs);
      setLongRunningToolIds([]);
      setToolConfirmations([]);
      setAuthRequests([]);
      setEscalated(false);
      setMessageMetadata(new Map());
    },
    [setMessagesImmediate],
  );

  const abortControllerRef = useRef<AbortController | null>(null);

  const { onError, onCustomEvent, onAgentTransfer } = useMemo(
    () => eventHandlers ?? {},
    [eventHandlers],
  );

  const aui = useAui();
  const sendMessage = useCallback(
    async (newMessages: AdkMessage[], config: AdkSendMessageConfig) => {
      const newMessagesWithId = newMessages.map((m) =>
        m.id ? m : { ...m, id: generateId() },
      ) as AdkMessage[];

      // A staged message is already in the thread under its own id, and the
      // merged event below re-emits the whole batch under the first one. Seeding
      // with the originals would leave every later staged id beside the merged
      // copy of itself.
      const resentIds = new Set(newMessagesWithId.map((m) => m.id));
      const accumulator = new AdkEventAccumulator(
        messagesRef.current.filter((m) => !resentIds.has(m.id)),
      );
      for (const event of messagesToEvents(newMessagesWithId)) {
        accumulator.processEvent(event);
      }
      setMessagesImmediate(accumulator.getMessages());

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const response = await stream(newMessagesWithId, {
          ...config,
          abortSignal: abortController.signal,
          initialize: async () => {
            return await aui.threadListItem.initialize();
          },
        });

        for await (const event of response) {
          if (
            abortController.signal.aborted ||
            abortControllerRef.current !== abortController
          ) {
            break;
          }
          const updatedMessages = accumulator.processEvent(event);
          setMessagesImmediate(updatedMessages);
          setStateDelta({
            ...stateDeltaRef.current,
            ...accumulator.getStateDelta(),
          });
          setAgentInfo(accumulator.getAgentInfo());
          setLongRunningToolIds(accumulator.getLongRunningToolIds());
          setArtifactDelta({
            ...artifactDeltaRef.current,
            ...accumulator.getArtifactDelta(),
          });
          setToolConfirmations(accumulator.getToolConfirmations());
          setAuthRequests(accumulator.getAuthRequests());
          setEscalated(accumulator.isEscalated());
          {
            const newMeta = accumulator.getMessageMetadata();
            if (newMeta.size > 0) {
              setMessageMetadata(
                new Map([...messageMetadataRef.current, ...newMeta]),
              );
            }
          }

          const transfer = accumulator.getLastTransferToAgent();
          if (transfer && transfer !== lastTransferToAgentRef.current) {
            lastTransferToAgentRef.current = transfer;
            invokeAdkRuntimeCallback(
              "onAgentTransfer",
              onAgentTransfer,
              transfer,
            );
          }

          // Fire custom event callback for events with customMetadata
          if (event.customMetadata && onCustomEvent) {
            for (const [key, value] of Object.entries(event.customMetadata)) {
              invokeAdkRuntimeCallback(
                "onCustomEvent",
                onCustomEvent,
                key,
                value,
              );
            }
          }

          if (event.errorCode || event.errorMessage) {
            invokeAdkRuntimeCallback(
              "onError",
              onError,
              event.errorMessage ?? event.errorCode,
            );
          }
        }
      } catch (error) {
        if (
          !abortController.signal.aborted &&
          abortControllerRef.current === abortController &&
          !(error instanceof Error && error.name === "AbortError")
        ) {
          throw error;
        }
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    },
    [
      aui,
      setMessagesImmediate,
      stream,
      onError,
      onCustomEvent,
      onAgentTransfer,
    ],
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  useEffect(() => cancel, [cancel]);

  return {
    messages,
    stateDelta,
    agentInfo,
    longRunningToolIds,
    artifactDelta,
    toolConfirmations,
    authRequests,
    escalated,
    messageMetadata,
    sendMessage,
    cancel,
    setMessages: setMessagesImmediate,
    replaceMessages,
    applySnapshot,
  };
};

/**
 * Transport sends every human and tool message of one `send` call as a single
 * ADK `Content`, and ADK parses that event's function responses before running
 * any tool, so the batch runs whole or not at all. The optimistic projection
 * has to sit on the same boundary, so a run of those messages becomes one
 * synthetic event whose parts come from the same per-message conversion.
 *
 * The transport drops `ai` messages from that `Content`, so one interleaved
 * between two replies does not split the batch on the wire and must not split
 * it here either. It still becomes its own event, placed after the merged one,
 * so the optimistic projection keeps the assistant turn.
 *
 * @internal — exported for unit tests.
 */
export const messagesToEvents = (messages: AdkMessage[]): AdkEvent[] => {
  // A reload sends no messages at all, and the empty user content the transport
  // puts on the wire for it is not part of the optimistic view: projecting one
  // would put an empty user bubble above every regenerated turn.
  if (messages.length === 0) return [];

  const events: AdkEvent[] = [];
  const run: AdkMessage[] = [];
  let runIndex = 0;

  for (const msg of messages) {
    if (msg.type === "ai") {
      events.push(messageToEvent(msg));
    } else {
      if (run.length === 0) runIndex = events.length;
      run.push(msg);
    }
  }

  const parts = run.flatMap((m) => messageToEvent(m).content?.parts ?? []);
  const human = run.find((m) => m.type === "human");

  // A batch that contributes no part still reaches the wire: the transport
  // sends an empty user `Content`, which a reload replays as an empty human
  // message. Emitting it here keeps the optimistic view equal to that replay.
  if (parts.length === 0) parts.push({ text: "" });

  const event: AdkEvent = { id: (human ?? run[0])?.id ?? generateId() };
  if (human || run.length === 0) event.author = "user";
  event.content = { role: "user", parts };
  events.splice(run.length > 0 ? runIndex : events.length, 0, event);

  return events;
};

/** @internal — exported for unit tests. */
export const messageToEvent = (msg: AdkMessage): AdkEvent => {
  if (msg.type === "human") {
    return {
      id: msg.id ?? generateId(),
      author: "user",
      content: { role: "user", parts: contentToParts(msg.content) },
    };
  }

  if (msg.type === "tool") {
    let response: unknown;
    try {
      response = JSON.parse(msg.content);
    } catch {
      response = msg.content;
    }
    return {
      id: msg.id ?? generateId(),
      content: {
        role: "user",
        parts: [
          {
            functionResponse: {
              name: msg.name,
              id: msg.tool_call_id,
              response,
            },
          },
        ],
      },
    };
  }

  const result: AdkEvent = { id: msg.id ?? generateId() };
  if (msg.author != null) result.author = msg.author;
  result.content = {
    role: "model",
    parts: [
      ...contentToParts(msg.content),
      ...(msg.tool_calls?.map((tc) => ({
        functionCall: { name: tc.name, id: tc.id, args: { ...tc.args } },
      })) ?? []),
    ],
  };
  return result;
};

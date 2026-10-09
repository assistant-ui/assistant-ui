import { isRecord } from "@assistant-ui/core/internal";
import {
  useState,
  useCallback,
  useRef,
  useMemo,
  useSyncExternalStore,
} from "react";
import { generateId } from "@assistant-ui/core";
import { useReplaySafeEffect } from "@assistant-ui/store/internal";
import { useAui } from "@assistant-ui/store";
import {
  abortableIterable,
  invokeUserCallback,
  openAbortableIterable,
} from "@assistant-ui/core/internal";
import { AdkEventAccumulator } from "./AdkEventAccumulator";
import { AdkThreadController } from "./AdkThreadController";
import { contentToParts } from "./contentToParts";
import { toAdkFunctionResponse } from "./toAdkFunctionResponse";
import type {
  AdkEvent,
  AdkMessage,
  AdkSendMessageConfig,
  AdkStreamCallback,
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

type UseAdkMessagesInternalOptions = UseAdkMessagesOptions & {
  onMessages?: (messages: AdkMessage[], runConfig: unknown) => void;
};

type AdkRuntimeCallbackName = "onError" | "onCustomEvent" | "onAgentTransfer";

const invokeAdkRuntimeCallback = <TArgs extends readonly unknown[]>(
  name: AdkRuntimeCallbackName,
  callback: ((...args: TArgs) => unknown) | undefined,
  ...args: TArgs
): void => {
  void invokeUserCallback("react-google-adk", name, callback, ...args);
};

const useAdkMessagesInternal = ({
  stream,
  eventHandlers,
  onMessages,
}: UseAdkMessagesInternalOptions) => {
  const [controller] = useState(() => new AdkThreadController());
  const {
    messages,
    stateDelta,
    agentInfo,
    longRunningToolIds,
    artifactDelta,
    toolConfirmations,
    authRequests,
    escalated,
    messageMetadata,
  } = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );

  const setMessagesImmediate = useCallback(
    (msgs: AdkMessage[]) => {
      controller.dispatch({ type: "messages.set", messages: msgs });
    },
    [controller],
  );
  /**
   * Swap the thread over to a loaded snapshot in one commit. Unlike
   * {@link replaceMessages} this never passes through a cleared state, so a
   * refetch that lands while a confirmation is on screen replaces it rather
   * than blanking it first.
   */
  const applySnapshot = useCallback(
    (snapshot: AdkThreadSnapshot) => {
      controller.dispatch({ type: "snapshot.applied", snapshot });
    },
    [controller],
  );

  // Replace the message list AND reset derived per-turn HITL state.
  // Used by truncation paths (edit, reload) so that stale interrupt
  // markers and per-message metadata from the removed messages don't leak
  // into the next turn.
  const replaceMessages = useCallback(
    (msgs: AdkMessage[]) => {
      controller.dispatch({ type: "messages.replaced", messages: msgs });
    },
    [controller],
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
      // The optimistic event for a tool-only batch carries no author, so the accumulator cannot settle the calls this send answers.
      const answeredToolCallIds = new Set(
        newMessagesWithId.flatMap((m) =>
          m.type === "tool" ? [m.tool_call_id] : [],
        ),
      );
      const currentState = controller.getState();
      const accumulator = new AdkEventAccumulator(
        currentState.messages.filter((m) => !resentIds.has(m.id)),
        currentState.longRunningToolIds.filter(
          (id) => !answeredToolCallIds.has(id),
        ),
      );
      for (const event of messagesToEvents(newMessagesWithId)) {
        accumulator.processEvent(event);
      }
      const initialMessages = accumulator.getMessages();
      const initialMessageIds = new Set(initialMessages.map((m) => m.id));
      const initialLongRunningToolIds = accumulator.getLongRunningToolIds();
      controller.dispatch({
        type: "run.started",
        messages: initialMessages,
        longRunningToolIds: initialLongRunningToolIds,
        toolConfirmations: accumulator.getToolConfirmations(),
        authRequests: accumulator.getAuthRequests(),
      });
      let lastTransferToAgent: string | undefined;

      // Google ADK replaces active runs, while React LangGraph queues sends.
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const response = await openAbortableIterable(
          stream(newMessagesWithId, {
            ...config,
            abortSignal: abortController.signal,
            initialize: async () => {
              return await aui.threadListItem.initialize();
            },
          }),
          abortController.signal,
        );
        if (!response) return;

        for await (const event of abortableIterable(
          response,
          abortController.signal,
        )) {
          if (
            abortController.signal.aborted ||
            abortControllerRef.current !== abortController
          ) {
            break;
          }
          const updatedMessages = accumulator.processEvent(event);
          // Each event part can append at most one message, and a function call
          // stays on the current assistant message until a later part finalizes
          // it, so every message touched by this event is within this tail.
          const affectedMessageCount = Math.max(
            event.content?.parts?.length ?? 0,
            1,
          );
          const affectedMessages = updatedMessages.slice(-affectedMessageCount);
          if (affectedMessages.length > 0) {
            onMessages?.(affectedMessages, config.runConfig);
          }
          controller.dispatch({
            type: "event.published",
            state: {
              messages: updatedMessages,
              stateDelta: accumulator.getStateDelta(),
              agentInfo: accumulator.getAgentInfo(),
              longRunningToolIds: accumulator.getLongRunningToolIds(),
              artifactDelta: accumulator.getArtifactDelta(),
              toolConfirmations: accumulator.getToolConfirmations(),
              authRequests: accumulator.getAuthRequests(),
              escalated: accumulator.isEscalated(),
              messageMetadata: accumulator.getMessageMetadata(),
            },
          });

          const transfer = accumulator.getLastTransferToAgent();
          if (transfer && transfer !== lastTransferToAgent) {
            lastTransferToAgent = transfer;
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
          if (abortController.signal.aborted) {
            controller.dispatch({
              type: "longRunningToolIds.set",
              ids: accumulator
                .getLongRunningToolIds()
                .filter((id) => initialLongRunningToolIds.includes(id)),
            });
            const updatedMessages = controller.getState().messages;
            const lastAssistantMessage = updatedMessages.findLast(
              (m) => m.type === "ai",
            );
            if (
              lastAssistantMessage &&
              !initialMessageIds.has(lastAssistantMessage.id) &&
              !lastAssistantMessage.status
            ) {
              setMessagesImmediate(
                updatedMessages.map((m) =>
                  m === lastAssistantMessage
                    ? {
                        ...lastAssistantMessage,
                        status: { type: "incomplete", reason: "cancelled" },
                      }
                    : m,
                ),
              );
            }
          }
          abortControllerRef.current = null;
        }
      }
    },
    [
      aui,
      controller,
      setMessagesImmediate,
      stream,
      onError,
      onCustomEvent,
      onAgentTransfer,
      onMessages,
    ],
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  useReplaySafeEffect(() => cancel, []);

  return {
    controller,
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

export const useAdkMessages = ({
  stream,
  eventHandlers,
}: UseAdkMessagesOptions) => {
  const { controller: _controller, ...result } = useAdkMessagesInternal({
    stream,
    ...(eventHandlers !== undefined && { eventHandlers }),
  });
  return result;
};

export { useAdkMessagesInternal };

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
              response: toAdkFunctionResponse(response, msg.status === "error"),
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
      ...(msg.tool_calls ?? []).filter(isRecord).map((tc) => ({
        functionCall: { name: tc.name, id: tc.id, args: { ...tc.args } },
      })),
    ],
  };
  return result;
};

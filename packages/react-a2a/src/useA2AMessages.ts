import { useState, useCallback, useRef, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { A2AMessageAccumulator } from "./A2AMessageAccumulator";
import {
  A2AEvent,
  A2AKnownEventTypes,
  A2ATaskState,
  A2AArtifact,
  A2ASendMessageConfig,
  A2AStreamCallback,
  OnTaskUpdateEventCallback,
  OnArtifactsEventCallback,
  OnErrorEventCallback,
  OnStateUpdateEventCallback,
  OnCustomEventCallback,
} from "./types";

export type A2AMessagesEvent<_TMessage> = A2AEvent;

const DEFAULT_APPEND_MESSAGE = <TMessage>(
  _: TMessage | undefined,
  curr: TMessage,
) => curr;

export const useA2AMessages = <TMessage extends { id?: string }>({
  stream,
  appendMessage = DEFAULT_APPEND_MESSAGE,
  eventHandlers,
}: {
  stream: A2AStreamCallback<TMessage>;
  appendMessage?: (prev: TMessage | undefined, curr: TMessage) => TMessage;
  eventHandlers?: {
    onTaskUpdate?: OnTaskUpdateEventCallback;
    onArtifacts?: OnArtifactsEventCallback;
    onError?: OnErrorEventCallback;
    onStateUpdate?: OnStateUpdateEventCallback;
    onCustomEvent?: OnCustomEventCallback;
  };
}) => {
  const [messages, setMessages] = useState<TMessage[]>([]);
  const [taskState, setTaskState] = useState<A2ATaskState | undefined>();
  const [artifacts, setArtifacts] = useState<A2AArtifact[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { onTaskUpdate, onArtifacts, onError, onStateUpdate, onCustomEvent } =
    useMemo(() => eventHandlers ?? {}, [eventHandlers]);

  const sendMessage = useCallback(
    async (newMessages: TMessage[], config: A2ASendMessageConfig) => {
      // ensure all messages have an ID
      const newMessagesWithId = newMessages.map((m) =>
        m.id ? m : { ...m, id: uuidv4() },
      );

      const accumulator = new A2AMessageAccumulator({
        initialMessages: messages,
        appendMessage,
      });
      setMessages(accumulator.addMessages(newMessagesWithId));

      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const response = await stream(newMessagesWithId, {
        ...config,
        abortSignal: abortController.signal,
      });

      for await (const event of response) {
        switch (event.event) {
          case A2AKnownEventTypes.TaskUpdate:
            const taskData = event.data as A2ATaskState;
            setTaskState(taskData);
            onTaskUpdate?.(taskData);
            break;

          case A2AKnownEventTypes.TaskComplete:
            // Extract messages and artifacts from completed task
            const { messages: taskMessages, artifacts: taskArtifacts } =
              event.data;
            if (taskMessages) {
              setMessages(accumulator.addMessages(taskMessages));
            }
            if (taskArtifacts) {
              setArtifacts(taskArtifacts);
              onArtifacts?.(taskArtifacts);
            }
            // Clear task state on completion
            setTaskState(undefined);
            break;

          case A2AKnownEventTypes.TaskFailed:
            onError?.(event.data);
            // Update task state to failed
            if (taskState) {
              setTaskState({
                ...taskState,
                state: "failed",
                message: event.data?.message,
              });
            }
            break;

          case A2AKnownEventTypes.Artifacts:
            const artifactData = event.data as A2AArtifact[];
            setArtifacts(artifactData);
            onArtifacts?.(artifactData);
            break;

          case A2AKnownEventTypes.StateUpdate:
            onStateUpdate?.(event.data);
            break;

          case A2AKnownEventTypes.Error:
            onError?.(event.data);
            // Update the last assistant message with error status if available
            const messages = accumulator.getMessages();
            const lastAssistantMessage = messages.findLast(
              (m): m is TMessage & { role: string; id: string } =>
                m != null &&
                "role" in m &&
                m.role === "assistant" &&
                m.id != null,
            );
            if (lastAssistantMessage) {
              const errorMessage = {
                ...lastAssistantMessage,
                status: {
                  type: "incomplete" as const,
                  reason: "error" as const,
                  error: event.data,
                },
              };
              setMessages(accumulator.addMessages([errorMessage]));
            }
            break;

          default:
            if (onCustomEvent) {
              onCustomEvent(event.event, event.data);
            } else {
              console.warn(
                "Unhandled A2A event received:",
                event.event,
                event.data,
              );
            }
            break;
        }
      }
    },
    [
      messages,
      appendMessage,
      stream,
      onTaskUpdate,
      onArtifacts,
      onError,
      onStateUpdate,
      onCustomEvent,
      taskState,
    ],
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, [abortControllerRef]);

  return {
    messages,
    artifacts,
    taskState,
    sendMessage,
    cancel,
    setMessages,
    setArtifacts,
    setTaskState,
  };
};

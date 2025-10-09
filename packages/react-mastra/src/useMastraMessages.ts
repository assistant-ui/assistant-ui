"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { MastraMessageAccumulator } from "./MastraMessageAccumulator";
import {
  MastraMessage,
  MastraEvent,
  MastraKnownEventTypes,
  MastraStreamCallback,
  MastraInterruptState,
} from "./types";

export type MastraSendMessageConfig = {
  abortSignal?: AbortSignal;
  maxRetries?: number;
  timeout?: number;
};

export type MastraMessagesEvent<TMessage> = {
  event: MastraKnownEventTypes;
  data: TMessage[] | any;
};

const DEFAULT_APPEND_MESSAGE = <TMessage>(
  _: TMessage | undefined,
  curr: TMessage,
) => curr;

export const useMastraMessages = <
  TMessage extends { id?: string } = MastraMessage,
>({
  stream,
  appendMessage = DEFAULT_APPEND_MESSAGE,
  eventHandlers,
}: {
  stream: MastraStreamCallback;
  appendMessage?: (prev: TMessage | undefined, curr: TMessage) => TMessage;
  eventHandlers?: {
    onMetadata?: (metadata: Record<string, any>) => void;
    onError?: (error: Error) => void;
    onInterrupt?: (interrupt: MastraInterruptState) => void;
    onCustomEvent?: (event: MastraEvent) => void;
    onToolCall?: (toolCall: any) => void;
    onToolResult?: (toolResult: any) => void;
  };
}) => {
  const [interrupt, setInterrupt] = useState<
    MastraInterruptState | undefined
  >();
  const [messages, setMessages] = useState<TMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    onMetadata,
    onError,
    onInterrupt,
    onCustomEvent,
    onToolCall,
  } = useMemo(() => eventHandlers ?? {}, [eventHandlers]);

  const sendMessage = useCallback(
    async (newMessages: TMessage[], config: MastraSendMessageConfig = {}) => {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Ensure all messages have an ID
      const newMessagesWithId = newMessages.map((m) =>
        m.id ? m : { ...m, id: uuidv4() },
      );

      const accumulator = new MastraMessageAccumulator<TMessage>({
        initialMessages: messages,
        appendMessage,
      });

      setMessages(accumulator.addMessages(newMessagesWithId));
      setIsRunning(true);

      try {
        const streamConfig = {
          ...config,
          abortSignal: abortController.signal,
        };

        const eventGenerator = await stream(
          newMessagesWithId as unknown as MastraMessage[],
          streamConfig,
        );

        for await (const event of eventGenerator) {
          // Check if request was aborted
          if (abortController.signal.aborted) {
            break;
          }

          try {
            switch (event.event) {
              case MastraKnownEventTypes.MessagePartial:
              case MastraKnownEventTypes.MessageComplete:
                const updatedMessages = accumulator.addMessages([
                  event.data as TMessage,
                ]);
                setMessages(updatedMessages);
                break;

              case MastraKnownEventTypes.ToolCall:
                onToolCall?.(event.data);
                break;

              case MastraKnownEventTypes.ToolCallPartial:
              case MastraKnownEventTypes.ToolResult:
              case MastraKnownEventTypes.ToolResultPartial:
                const toolUpdatedMessages = accumulator.addMessages([
                  event.data as TMessage,
                ]);
                setMessages(toolUpdatedMessages);
                break;

              case MastraKnownEventTypes.Metadata:
                onMetadata?.(event.data);
                break;

              case MastraKnownEventTypes.Error:
                const error = new Error(
                  event.data?.message || event.data?.error || "Unknown error",
                );
                onError?.(error);
                setIsRunning(false);
                return;

              case MastraKnownEventTypes.Interrupt:
                setInterrupt(event.data);
                onInterrupt?.(event.data);
                setIsRunning(false);
                return;

              default:
                onCustomEvent?.(event);
                break;
            }
          } catch (error) {
            console.error("Error processing event:", error);
            onError?.(
              error instanceof Error
                ? error
                : new Error("Unknown processing error"),
            );
          }
        }

        // Stream completed successfully
        setIsRunning(false);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          // Request was aborted, don't treat as error
          console.log("Stream request aborted");
        } else {
          onError?.(
            error instanceof Error ? error : new Error("Unknown stream error"),
          );
        }
        setIsRunning(false);
      } finally {
        abortControllerRef.current = null;
      }
    },
    [
      stream,
      messages,
      appendMessage,
      onMetadata,
      onError,
      onInterrupt,
      onCustomEvent,
      onToolCall,
    ],
  );

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setInterrupt(undefined);
  }, []);

  const resetInterrupt = useCallback(() => {
    setInterrupt(undefined);
  }, []);

  return {
    messages,
    isRunning,
    interrupt,
    sendMessage,
    cancelRequest,
    clearMessages,
    resetInterrupt,
  };
};

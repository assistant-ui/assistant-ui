"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { MastraMessageAccumulator } from "./MastraMessageAccumulator";
import {
  MastraEvent,
  MastraInterruptState,
  MastraKnownEventTypes,
  MastraMessage,
  MastraToolCall,
  MastraToolResult,
  MastraSendMessageConfig,
  MastraStreamCallback,
} from "./types";

export type {
  MastraSendMessageConfig,
  MastraStreamCallback,
  MastraEvent,
} from "./types";

const DEFAULT_APPEND_MESSAGE = <TMessage>(
  _: TMessage | undefined,
  curr: TMessage,
) => curr;

const toError = (value: unknown, fallback: string) =>
  value instanceof Error ? value : new Error(fallback);

const eventError = (event: MastraEvent) => {
  const data =
    typeof event.data === "object" && event.data != null
      ? (event.data as Record<string, unknown>)
      : undefined;
  const message =
    typeof event.data === "string"
      ? event.data
      : typeof data?.["message"] === "string"
        ? data["message"]
        : typeof data?.["error"] === "string"
          ? data["error"]
          : "Mastra stream error";
  return new Error(message);
};

export const useMastraMessages = <
  TMessage extends MastraMessage = MastraMessage,
>({
  stream,
  appendMessage = DEFAULT_APPEND_MESSAGE,
  eventHandlers,
}: {
  stream: MastraStreamCallback;
  appendMessage?: (prev: TMessage | undefined, curr: TMessage) => TMessage;
  eventHandlers?: {
    onMetadata?: (metadata: Record<string, unknown>) => void;
    onError?: (error: Error) => void;
    onInterrupt?: (interrupt: MastraInterruptState) => void;
    onCustomEvent?: (event: MastraEvent) => void;
    onToolCall?: (toolCall: MastraToolCall) => void;
    onToolResult?: (toolResult: MastraToolResult) => void;
  };
}) => {
  const [interrupt, setInterrupt] = useState<
    MastraInterruptState | undefined
  >();
  const [messages, setMessages] = useState<TMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const {
    onMetadata,
    onError,
    onInterrupt,
    onCustomEvent,
    onToolCall,
    onToolResult,
  } = useMemo(() => eventHandlers ?? {}, [eventHandlers]);

  const replaceMessages = useCallback((nextMessages: TMessage[]) => {
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    setInterrupt(undefined);
  }, []);

  const sendMessage = useCallback(
    async (newMessages: TMessage[], config: MastraSendMessageConfig = {}) => {
      abortControllerRef.current?.abort();

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      if (config.abortSignal) {
        if (config.abortSignal.aborted) return;
        const abort = () => abortController.abort();
        config.abortSignal.addEventListener("abort", abort, { once: true });
        abortController.signal.addEventListener(
          "abort",
          () => config.abortSignal?.removeEventListener("abort", abort),
          { once: true },
        );
      }

      const messagesWithIds = newMessages.map((message) =>
        message.id ? message : { ...message, id: uuidv4() },
      ) as TMessage[];

      const accumulator = new MastraMessageAccumulator<TMessage>({
        initialMessages: messagesRef.current,
        appendMessage,
      });
      replaceMessages(accumulator.addMessages(messagesWithIds));
      setIsRunning(true);

      try {
        const iterable = await stream(messagesWithIds, {
          ...config,
          abortSignal: abortController.signal,
        });

        for await (const event of iterable) {
          if (abortController.signal.aborted) break;

          switch (event.event) {
            case MastraKnownEventTypes.Message:
            case MastraKnownEventTypes.MessagePartial:
            case MastraKnownEventTypes.MessageComplete:
            case MastraKnownEventTypes.ToolCallPartial:
            case MastraKnownEventTypes.ToolResultPartial: {
              const updated = accumulator.addMessages([event.data as TMessage]);
              replaceMessages(updated);
              break;
            }

            case MastraKnownEventTypes.ToolCall:
              onToolCall?.(event.data as MastraToolCall);
              break;

            case MastraKnownEventTypes.ToolResult:
              onToolResult?.(event.data as MastraToolResult);
              break;

            case MastraKnownEventTypes.Metadata:
              onMetadata?.(event.data as Record<string, unknown>);
              break;

            case MastraKnownEventTypes.Error:
              onError?.(eventError(event));
              return;

            case MastraKnownEventTypes.Interrupt:
              setInterrupt(event.data as MastraInterruptState);
              onInterrupt?.(event.data as MastraInterruptState);
              return;

            default:
              onCustomEvent?.(event);
              break;
          }
        }
      } catch (error) {
        if (
          !abortController.signal.aborted &&
          !(error instanceof Error && error.name === "AbortError")
        ) {
          onError?.(toError(error, "Mastra stream failed"));
        }
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
        setIsRunning(false);
      }
    },
    [
      appendMessage,
      onCustomEvent,
      onError,
      onInterrupt,
      onMetadata,
      onToolCall,
      onToolResult,
      replaceMessages,
      stream,
    ],
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsRunning(false);
  }, []);

  const clearMessages = useCallback(() => {
    replaceMessages([]);
  }, [replaceMessages]);

  const resetInterrupt = useCallback(() => {
    setInterrupt(undefined);
  }, []);

  return {
    messages,
    isRunning,
    interrupt,
    sendMessage,
    cancel,
    clearMessages,
    replaceMessages,
    resetInterrupt,
  };
};

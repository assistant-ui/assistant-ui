"use client";

import { useState, useCallback, useRef } from "react";
import {
  useExternalStoreRuntime,
  useAssistantState,
} from "@assistant-ui/react";
import { LegacyMastraMessageConverter } from "./convertMastraMessages";
import { MastraMessageAccumulator } from "./MastraMessageAccumulator";
import { appendMastraChunk, extractMastraToolCalls } from "./appendMastraChunk";
import {
  MastraRuntimeConfig,
  MastraMessage,
  MastraEvent,
  MastraKnownEventTypes,
  MastraRuntimeExtras,
} from "./types";

const getMessageContent = (msg: any): string => {
  // Enhanced message content extraction for Phase 2
  if (typeof msg.content === "string") {
    return msg.content;
  }

  if (Array.isArray(msg.content)) {
    const textPart = msg.content.find((part: any) => part.type === "text");
    return textPart?.text || "";
  }

  return "";
};

const symbolMastraRuntimeExtras = Symbol("mastra-runtime-extras");

const asMastraRuntimeExtras = (extras: unknown): MastraRuntimeExtras => {
  if (
    typeof extras !== "object" ||
    extras == null ||
    !(symbolMastraRuntimeExtras in extras)
  )
    throw new Error(
      "This method can only be called when you are using useMastraRuntime",
    );

  return extras as unknown as MastraRuntimeExtras;
};

export const useMastraRuntime = (config: MastraRuntimeConfig) => {
  const [messages, setMessages] = useState<MastraMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const accumulatorRef = useRef<MastraMessageAccumulator<MastraMessage>>(
    new MastraMessageAccumulator<MastraMessage>(),
  );

  const processEvent = useCallback(
    (event: MastraEvent) => {
      switch (event.event) {
        case MastraKnownEventTypes.MessagePartial:
        case MastraKnownEventTypes.MessageComplete:
          const accumulator = accumulatorRef.current;
          if (accumulator) {
            const newMessages = accumulator.addMessages([event.data]);
            setMessages(newMessages);
          }
          break;
        case MastraKnownEventTypes.ToolCall:
          config.eventHandlers?.onToolCall?.(event.data);
          break;
        case MastraKnownEventTypes.ToolResult:
          config.eventHandlers?.onToolResult?.(event.data);
          break;
        case MastraKnownEventTypes.ToolCallPartial:
          // Handle partial tool call updates
          const toolAccumulator = accumulatorRef.current;
          if (toolAccumulator) {
            const updatedToolMessages = toolAccumulator.addMessages([
              event.data,
            ]);
            setMessages(updatedToolMessages);
          }
          break;
        case MastraKnownEventTypes.ToolResultPartial:
          // Handle partial tool result updates
          const resultAccumulator = accumulatorRef.current;
          if (resultAccumulator) {
            const updatedResultMessages = resultAccumulator.addMessages([
              event.data,
            ]);
            setMessages(updatedResultMessages);
          }
          break;
        case MastraKnownEventTypes.Error:
          config.onError?.(new Error(event.data));
          config.eventHandlers?.onError?.(new Error(event.data));
          setIsRunning(false);
          break;
        case MastraKnownEventTypes.Metadata:
          config.eventHandlers?.onMetadata?.(event.data);
          break;
        case MastraKnownEventTypes.Interrupt:
          config.eventHandlers?.onInterrupt?.(event.data);
          setIsRunning(false);
          break;
      }
    },
    [config],
  );

  const handleNew = useCallback(
    async (message: any) => {
      setIsRunning(true);

      // Initialize accumulator for this conversation
      accumulatorRef.current = new MastraMessageAccumulator<MastraMessage>({
        initialMessages: messages,
        appendMessage: appendMastraChunk,
        onMessageUpdate: (msg) => {
          // Handle tool call updates
          const toolCalls = extractMastraToolCalls(msg);
          toolCalls.forEach((toolCall) => {
            config.eventHandlers?.onToolCall?.(toolCall);
          });
        },
      });

      try {
        const response = await fetch(config.api, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: getMessageContent(message) }],
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                setIsRunning(false);
                return;
              }

              try {
                const event = JSON.parse(data);
                processEvent(event);
              } catch (e) {
                console.error("Failed to parse event:", e);
              }
            }
          }
        }
      } catch (error) {
        config.onError?.(
          error instanceof Error ? error : new Error("Unknown error"),
        );
        setIsRunning(false);
      }
    },
    [config.api, config.onError, config.eventHandlers, processEvent],
  );

  // Convert Mastra messages to assistant-ui ThreadMessage format
  const convertedMessages = messages.map(LegacyMastraMessageConverter).flat();

  const runtime = useExternalStoreRuntime({
    isRunning,
    messages: convertedMessages as any,
    onNew: handleNew,
    onEdit: async () => {
      // Handle message editing
      setIsRunning(true);
      try {
        // TODO: Implement message editing in Phase 3
        console.warn("Message editing not yet implemented");
      } catch (error) {
        config.onError?.(
          error instanceof Error ? error : new Error("Unknown error"),
        );
      } finally {
        setIsRunning(false);
      }
    },
    onReload: async () => {
      // Handle message reloading
      setIsRunning(true);
      try {
        // TODO: Implement message reloading in Phase 3
        console.warn("Message reloading not yet implemented");
      } catch (error) {
        config.onError?.(
          error instanceof Error ? error : new Error("Unknown error"),
        );
      } finally {
        setIsRunning(false);
      }
    },
    adapters: config.adapters,
    convertMessage: LegacyMastraMessageConverter as any,
    extras: {
      [symbolMastraRuntimeExtras]: {
        agentId: config.agentId,
        isStreaming: isRunning,
      },
    },
  });

  return runtime;
};

export const useMastraExtras = () => {
  const extras = useAssistantState(({ thread }) =>
    asMastraRuntimeExtras(thread.extras),
  );
  return extras;
};

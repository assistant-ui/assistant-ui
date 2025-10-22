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
import { useMastraMemory } from "./useMastraMemory";
import { useMastraWorkflows } from "./useMastraWorkflows";

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
    new MastraMessageAccumulator<MastraMessage>({
      initialMessages: [],
      appendMessage: appendMastraChunk,
      onMessageUpdate: (msg) => {
        // Handle tool call updates
        const toolCalls = extractMastraToolCalls(msg);
        toolCalls.forEach((toolCall) => {
          config.eventHandlers?.onToolCall?.(toolCall);
        });
      },
    }),
  );

  // Initialize Mastra features - Real Mastra APIs only
  const memory = useMastraMemory(config.memory || { storage: "libsql" });
  const workflow = useMastraWorkflows(config.workflow || { workflowId: "" });

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
          // Normalize error data to a meaningful message
          const errorMessage =
            typeof event.data === "string"
              ? event.data
              : event.data?.message || event.data?.error || "Unknown error";
          const error = new Error(errorMessage);
          config.onError?.(error);
          config.eventHandlers?.onError?.(error);
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

      // Add user message to our messages state
      const userMessage: MastraMessage = {
        id: crypto.randomUUID(),
        type: "human",
        content: getMessageContent(message),
        timestamp: new Date().toISOString(),
      };

      // Add the user message to the accumulator instead of replacing it
      const updatedMessages = accumulatorRef.current.addMessages([userMessage]);
      setMessages(updatedMessages);

      try {
        // Get or create thread ID for memory
        let threadId: string | undefined;
        if (config.memory && memory) {
          if (memory.currentThread) {
            threadId = memory.currentThread;
          } else {
            // Create a new thread if one doesn't exist
            threadId = await memory.createThread();
          }
        }

        // Get memory context if available
        const memoryContext = config.memory
          ? {
              threadId: threadId || "default-thread",
              resourceId: config.memory.userId || "default-user",
            }
          : undefined;

        const response = await fetch(config.api, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: getMessageContent(message) }],
            agentId: config.agentId,
            // Add memory context to request
            ...(memoryContext && memoryContext),
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
          if (done) {
            setIsRunning(false);
            break;
          }

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
                // Notify error handler instead of logging to console
                config.onError?.(
                  e instanceof Error ? e : new Error("Failed to parse event"),
                );
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
    [config, processEvent, memory],
  );

  // Filter out empty or invalid messages before passing to runtime
  // The runtime will handle conversion using the convertMessage callback
  const filteredMessages = messages.filter(
    (msg) => msg && msg.type && msg.content != null,
  );

  const runtime = useExternalStoreRuntime({
    isRunning,
    messages: filteredMessages as any,
    onNew: handleNew,
    onEdit: async (message: any) => {
      // Handle message editing
      setIsRunning(true);
      try {
        // 1. Get the parent message ID (the message before edit point)
        const parentId = message.parentId;

        // 2. Find all messages after the parent (these will be deleted)
        const currentMessages = accumulatorRef.current.getMessages();
        const parentIndex = currentMessages.findIndex(
          (msg) => msg.id === parentId,
        );

        if (parentIndex === -1) {
          throw new Error(`Parent message ${parentId} not found`);
        }

        // 3. Update local accumulator state - remove messages after edit point
        // Note: We don't delete from Mastra memory - Mastra's append-only architecture
        // means old messages stay in storage but won't be retrieved since we're
        // continuing from the parent message
        const remainingMessages = currentMessages.slice(0, parentIndex + 1);
        accumulatorRef.current.reset(remainingMessages);
        setMessages(remainingMessages);

        // 4. Add the edited user message
        const editedMessage: MastraMessage = {
          id: crypto.randomUUID(),
          type: "human",
          content: getMessageContent(message),
          timestamp: new Date().toISOString(),
        };

        const messagesWithEdit = accumulatorRef.current.addMessages([
          editedMessage,
        ]);
        setMessages(messagesWithEdit);

        // 5. Get memory context if available
        let threadId: string | undefined;
        if (config.memory && memory) {
          threadId = memory.currentThread || (await memory.createThread());
        }

        const memoryContext = config.memory
          ? {
              threadId: threadId || "default-thread",
              resourceId: config.memory.userId || "default-user",
            }
          : undefined;

        // 6. Stream agent response
        const response = await fetch(config.api, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: getMessageContent(message) }],
            agentId: config.agentId,
            ...(memoryContext && memoryContext),
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 7. Process streaming response (same as handleNew)
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            setIsRunning(false);
            break;
          }

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
                // Notify error handler instead of logging to console
                config.onError?.(
                  e instanceof Error ? e : new Error("Failed to parse event"),
                );
              }
            }
          }
        }
      } catch (error) {
        config.onError?.(
          error instanceof Error ? error : new Error("Unknown error"),
        );
      } finally {
        setIsRunning(false);
      }
    },
    onReload: async () => {
      // Message reloading is not yet supported in this version
      throw new Error("Message reloading is not yet supported");
    },
    adapters: config.adapters,
    convertMessage: LegacyMastraMessageConverter as any,
    extras: {
      [symbolMastraRuntimeExtras]: {
        agentId: config.agentId,
        isStreaming: isRunning,
        // Only include Real Mastra features if they were configured
        ...(config.memory && { memory }),
        ...(config.workflow && { workflow }),
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

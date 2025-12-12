import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  MessageRepository,
  generateId,
  type ThreadMessage,
  type Unsubscribe,
  type ThreadRuntime,
  type ThreadRuntimeState,
  type ComposerRuntime,
  type ComposerRuntimeState,
} from "@assistant-ui/react-native";
import OpenAI from "openai";
import { fetch as expoFetch } from "expo/fetch";

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
  fetch: expoFetch as unknown as typeof globalThis.fetch,
});

interface UseChatRuntimeOptions {
  threadId: string;
  getMessages: (threadId: string) => Promise<ThreadMessage[]>;
  saveMessages: (
    threadId: string,
    messages: readonly ThreadMessage[],
  ) => Promise<void>;
}

export function useChatRuntime({
  threadId,
  getMessages,
  saveMessages,
}: UseChatRuntimeOptions) {
  const messageRepository = useRef(new MessageRepository()).current;
  const [threadState, setThreadState] = useState<ThreadRuntimeState>(() =>
    createInitialThreadState(threadId),
  );
  const [composerState, setComposerState] = useState<ComposerRuntimeState>(() =>
    createInitialComposerState(),
  );
  const [isInitialized, setIsInitialized] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const subscribersRef = useRef<Set<() => void>>(new Set());
  const composerSubscribersRef = useRef<Set<() => void>>(new Set());
  const threadIdRef = useRef(threadId);

  // Keep threadId ref updated
  useEffect(() => {
    threadIdRef.current = threadId;
  }, [threadId]);

  const notifySubscribers = useCallback(() => {
    subscribersRef.current.forEach((cb) => cb());
  }, []);

  const notifyComposerSubscribers = useCallback(() => {
    composerSubscribersRef.current.forEach((cb) => cb());
  }, []);

  const updateThreadState = useCallback(
    (shouldSave = true) => {
      const messages = messageRepository.getMessages();

      setThreadState((prev) => ({
        ...prev,
        messages,
        isEmpty: messages.length === 0,
      }));
      notifySubscribers();

      // Save messages to storage
      if (shouldSave && messages.length > 0) {
        saveMessages(threadIdRef.current, messages);
      }
    },
    [messageRepository, notifySubscribers, saveMessages],
  );

  // Load messages on mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const messages = await getMessages(threadId);
        if (messages.length > 0) {
          // Clear existing messages
          messageRepository.resetHead(null);

          // Add messages to repository
          let parentId: string | null = null;
          for (const message of messages) {
            messageRepository.addOrUpdateMessage(parentId, message);
            parentId = message.id;
          }

          // Update state without saving (we just loaded)
          const loadedMessages = messageRepository.getMessages();
          setThreadState((prev) => ({
            ...prev,
            threadId,
            messages: loadedMessages,
            isEmpty: loadedMessages.length === 0,
            isLoading: false,
          }));
          notifySubscribers();
        } else {
          setThreadState((prev) => ({
            ...prev,
            threadId,
            isLoading: false,
          }));
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
        setThreadState((prev) => ({
          ...prev,
          threadId,
          isLoading: false,
        }));
      }
      setIsInitialized(true);
    };

    setThreadState((prev) => ({ ...prev, isLoading: true }));
    loadMessages();
  }, [threadId, getMessages, messageRepository, notifySubscribers]);

  const callOpenAI = useCallback(
    async (parentId: string) => {
      setThreadState((prev) => ({ ...prev, isRunning: true }));
      notifySubscribers();

      abortControllerRef.current = new AbortController();

      const assistantMessageId = generateId();

      const initialAssistantMessage: ThreadMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: [{ type: "text", text: "" }],
        createdAt: new Date(),
        status: { type: "running" },
        metadata: {
          unstable_state: null,
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
          custom: {},
        },
      };

      messageRepository.addOrUpdateMessage(parentId, initialAssistantMessage);
      updateThreadState(false); // Don't save running state

      try {
        const messages = messageRepository.getMessages();
        const openAIMessages: OpenAI.ChatCompletionMessageParam[] = messages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content
              .filter((p) => p.type === "text")
              .map((p) => ("text" in p ? p.text : ""))
              .join("\n"),
          }));

        const stream = await openai.chat.completions.create(
          {
            model: "gpt-4o-mini",
            messages: openAIMessages,
            stream: true,
          },
          {
            signal: abortControllerRef.current.signal,
          },
        );

        let fullText = "";

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content ?? "";
          fullText += content;

          const updatedMessage: ThreadMessage = {
            id: assistantMessageId,
            role: "assistant",
            content: [{ type: "text", text: fullText }],
            createdAt: initialAssistantMessage.createdAt,
            status: { type: "running" },
            metadata: {
              unstable_state: null,
              unstable_annotations: [],
              unstable_data: [],
              steps: [],
              custom: {},
            },
          };

          messageRepository.addOrUpdateMessage(parentId, updatedMessage);
          updateThreadState(false); // Don't save during streaming
        }

        const finalMessage: ThreadMessage = {
          id: assistantMessageId,
          role: "assistant",
          content: [{ type: "text", text: fullText }],
          createdAt: initialAssistantMessage.createdAt,
          status: { type: "complete", reason: "stop" },
          metadata: {
            unstable_state: null,
            unstable_annotations: [],
            unstable_data: [],
            steps: [],
            custom: {},
          },
        };

        messageRepository.addOrUpdateMessage(parentId, finalMessage);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          const existingMessage =
            messageRepository.getMessage(assistantMessageId).message;
          const existingText = existingMessage.content
            .filter((p) => p.type === "text")
            .map((p) => ("text" in p ? p.text : ""))
            .join("");

          const cancelledMessage: ThreadMessage = {
            id: assistantMessageId,
            role: "assistant",
            content: [{ type: "text", text: existingText }],
            createdAt: initialAssistantMessage.createdAt,
            status: { type: "incomplete", reason: "cancelled" },
            metadata: {
              unstable_state: null,
              unstable_annotations: [],
              unstable_data: [],
              steps: [],
              custom: {},
            },
          };
          messageRepository.addOrUpdateMessage(parentId, cancelledMessage);
        } else {
          console.error("OpenAI API error:", error);
          const errorMessage: ThreadMessage = {
            id: assistantMessageId,
            role: "assistant",
            content: [
              {
                type: "text",
                text: `Error: ${(error as Error).message || "Failed to get response"}`,
              },
            ],
            createdAt: initialAssistantMessage.createdAt,
            status: { type: "incomplete", reason: "error" },
            metadata: {
              unstable_state: null,
              unstable_annotations: [],
              unstable_data: [],
              steps: [],
              custom: {},
            },
          };
          messageRepository.addOrUpdateMessage(parentId, errorMessage);
        }
      } finally {
        setThreadState((prev) => ({ ...prev, isRunning: false }));
        abortControllerRef.current = null;
        updateThreadState(true); // Save final state
      }
    },
    [messageRepository, updateThreadState, notifySubscribers],
  );

  const append = useCallback(
    (message: {
      role: "user" | "assistant";
      content: readonly { type: string; text?: string }[];
    }) => {
      const messages = messageRepository.getMessages();
      const parentId = messages.at(-1)?.id ?? null;

      const id = generateId();
      const createdAt = new Date();
      const content = message.content.map((part) => ({
        type: "text" as const,
        text: part.text ?? "",
      }));

      if (message.role === "user") {
        const userMessage: ThreadMessage = {
          id,
          role: "user",
          content,
          createdAt,
          attachments: [],
          metadata: {
            custom: {},
          },
        };
        messageRepository.addOrUpdateMessage(parentId, userMessage);
        updateThreadState(true); // Save user message
        callOpenAI(userMessage.id);
      } else {
        const assistantMessage: ThreadMessage = {
          id,
          role: "assistant",
          content,
          createdAt,
          status: { type: "complete", reason: "stop" },
          metadata: {
            unstable_state: null,
            unstable_annotations: [],
            unstable_data: [],
            steps: [],
            custom: {},
          },
        };
        messageRepository.addOrUpdateMessage(parentId, assistantMessage);
        updateThreadState(true);
      }
    },
    [messageRepository, updateThreadState, callOpenAI],
  );

  const cancelRun = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setThreadState((prev) => ({ ...prev, isRunning: false }));
    notifySubscribers();
  }, [notifySubscribers]);

  const threadRuntime: ThreadRuntime = useMemo(
    () => ({
      getState: () => threadState,
      subscribe: (callback: () => void): Unsubscribe => {
        subscribersRef.current.add(callback);
        return () => {
          subscribersRef.current.delete(callback);
        };
      },
      append,
      startRun: () => {},
      cancelRun,
    }),
    [threadState, append, cancelRun],
  );

  const composerRuntime: ComposerRuntime = useMemo(
    () => ({
      getState: () => composerState,
      subscribe: (callback: () => void): Unsubscribe => {
        composerSubscribersRef.current.add(callback);
        return () => {
          composerSubscribersRef.current.delete(callback);
        };
      },
      setText: (text: string) => {
        setComposerState((prev) => ({
          ...prev,
          text,
          isEmpty: text.length === 0,
          canSend: text.trim().length > 0 && !threadState.isRunning,
        }));
        notifyComposerSubscribers();
      },
      send: () => {
        const text = composerState.text.trim();
        if (!text || threadState.isRunning) return;

        append({
          role: "user",
          content: [{ type: "text", text }],
        });

        setComposerState((prev) => ({
          ...prev,
          text: "",
          isEmpty: true,
          canSend: false,
        }));
        notifyComposerSubscribers();
      },
      cancel: cancelRun,
      reset: () => {
        setComposerState(createInitialComposerState());
        notifyComposerSubscribers();
      },
      addAttachment: async () => {},
      removeAttachment: async () => {},
    }),
    [
      composerState,
      threadState.isRunning,
      append,
      cancelRun,
      notifyComposerSubscribers,
    ],
  );

  return { threadRuntime, composerRuntime, isInitialized };
}

function createInitialThreadState(threadId: string): ThreadRuntimeState {
  return {
    threadId,
    isRunning: false,
    isDisabled: false,
    isEmpty: true,
    isLoading: true,
    messages: [],
    capabilities: {
      switchToBranch: false,
      edit: false,
      reload: false,
      cancel: true,
      unstable_copy: true,
      speech: false,
      attachments: false,
      feedback: false,
    },
  };
}

function createInitialComposerState(): ComposerRuntimeState {
  return {
    text: "",
    attachments: [],
    canSend: false,
    canCancel: false,
    isEditing: false,
    isEmpty: true,
    type: "thread",
  };
}

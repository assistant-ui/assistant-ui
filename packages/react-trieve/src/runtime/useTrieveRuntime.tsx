"use client";

import {
  AssistantRuntime,
  ThreadSuggestion,
  ThreadMessageLike,
  ThreadRuntime,
  ThreadState,
  useExternalStoreRuntime,
  useThread,
} from "@assistant-ui/react";

import { useCallback, useEffect, useRef, useState } from "react";
import { toTrieveStream, TrieveStreamPart } from "../trieve/trieveStream";
import { TrieveSDK } from "trieve-ts-sdk";
import { TrieveMessage } from "../trieve/TrieveMessage";

const convertMessage = (message: TrieveMessage): ThreadMessageLike => {
  return {
    id: message.sort_order.toString(),
    role: message.role === "user" ? "user" : "assistant",
    content: message.content,
  };
};

const fetchMessages = async (
  trieve: TrieveSDK,
  messagesTopicId: string | undefined,
) => {
  if (!messagesTopicId) return [];
  return trieve.getAllMessagesForTopic({
    messagesTopicId,
  });
};

const fetchInitialSuggestions = async (trieve: TrieveSDK) => {
  return (await trieve.suggestedQueries({})).queries;
};

const sliceMessagesUntil = (
  messages: TrieveMessage[],
  messageId: string | null,
) => {
  if (messageId == null) return [];

  const messageIdx = messages.findIndex(
    (m) => m.sort_order.toString() === messageId,
  );
  if (messageIdx === -1)
    throw new Error(`Message with id ${messageId} not found`);

  return messages.slice(0, messageIdx + 1);
};

export type TrieveExtras = {
  title: string;
};

type AssistantRuntimeWithExtras<TExtras> = Omit<AssistantRuntime, "thread"> & {
  thread: Omit<ThreadRuntime, "getState"> & {
    getState(): ThreadState & {
      extras: TExtras;
    };
  };
};

export const useTrieveRuntime = ({
  trieve,
  ownerId,
}: {
  trieve: TrieveSDK;
  ownerId: string;
}) => {
  const [title, setTitle] = useState("");
  const threadIdRef = useRef<string | undefined>();
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState<TrieveMessage[]>([]);
  const [suggestions, setSuggestions] = useState<ThreadSuggestion[]>([]);

  const withRunning = useCallback(async <T,>(promise: Promise<T>) => {
    setIsRunning(true);
    try {
      return await promise;
    } finally {
      setIsRunning(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages(trieve, undefined).then((data) => {
      setMessages(data);
    });
    fetchInitialSuggestions(trieve).then((data) => {
      setSuggestions(data.map((d) => ({ prompt: d })));
    });
  }, [trieve]);

  const handleStream = useCallback(
    async (stream: AsyncIterable<TrieveStreamPart>) => {
      let assistantMessage = "";
      for await (const chunk of stream) {
        if (chunk.type === "text-delta") {
          assistantMessage += chunk.textDelta;
          setMessages((prev) => [
            ...prev.slice(0, -1),
            {
              ...prev[prev.length - 1]!,
              content: assistantMessage,
            },
          ]);
        } else if (chunk.type === "citations") {
          setMessages((prev) => [
            ...prev.slice(0, -1),
            {
              ...prev[prev.length - 1]!,
              citations: chunk.citations,
            },
          ]);
        }
      }
    },
    [],
  );

  const runtime = useExternalStoreRuntime({
    isRunning,
    messages,
    extras: { title } satisfies TrieveExtras,
    convertMessage,
    onNew: async ({ content }) => {
      const userMessage = content
        .filter((m) => m.type === "text")
        .map((m) => m.text)
        .join("\n\n");

      setMessages((prev) => [
        ...prev,
        {
          sort_order: prev.length + 1,
          role: "user",
          content: userMessage,
        },
        {
          sort_order: prev.length + 2,
          role: "assistant",
          content: "",
        },
      ]);

      if (!threadIdRef.current) {
        const topicResponse = await withRunning(
          trieve.createTopic({
            owner_id: ownerId,
            first_user_message: userMessage,
          }),
        );
        threadIdRef.current = topicResponse.id;
        setTitle(topicResponse.name);
      }

      await withRunning(
        trieve
          .createMessageReader({
            topic_id: threadIdRef.current,
            new_message_content: userMessage,
          })
          .then(toTrieveStream)
          .then(handleStream),
      );
    },
    onEdit: async ({ content, parentId }) => {
      const userMessage = content
        .filter((m) => m.type === "text")
        .map((m) => m.text)
        .join("\n\n");

      let message_sort_order = 0;
      setMessages((prev) => {
        prev = sliceMessagesUntil(prev, parentId);
        message_sort_order = prev.length + 1;
        return [
          ...prev,
          {
            sort_order: prev.length + 1,
            role: "user",
            content: userMessage,
          },
          {
            sort_order: prev.length + 2,
            role: "assistant",
            content: "",
          },
        ];
      });

      await withRunning(
        trieve
          .editMessageReader({
            topic_id: threadIdRef.current!,
            message_sort_order,
            new_message_content: userMessage,
          })
          .then(toTrieveStream)
          .then(handleStream),
      );
    },

    onReload: async () => {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          ...prev[prev.length - 1]!,
          content: "",
          citations: undefined,
        },
      ]);

      await withRunning(
        trieve
          .regenerateMessageReader({
            topic_id: threadIdRef.current!,
          })
          .then(toTrieveStream)
          .then(handleStream),
      );
    },

    suggestions,
  });

  return runtime as AssistantRuntimeWithExtras<TrieveExtras>;
};

export function useTrieveExtras(): TrieveExtras;
export function useTrieveExtras<T>(selector: (extras: TrieveExtras) => T): T;
export function useTrieveExtras<T>(
  selector: (extras: TrieveExtras) => T = (extras) => extras as T,
): T {
  return useThread((t) => selector(t.extras as TrieveExtras));
}

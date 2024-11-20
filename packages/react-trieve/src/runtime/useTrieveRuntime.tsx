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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toTrieveStream, TrieveStreamPart } from "../trieve/trieveStream";
import { ChunkMetadata, SearchMethod, TrieveSDK } from "trieve-ts-sdk";
import { TrieveMessage } from "../trieve/TrieveMessage";
import { useCallbackRef } from "@radix-ui/react-use-callback-ref";

const symbolTrieveExtras = Symbol("trieve-extras");

export type TrieveExtras = {
  [symbolTrieveExtras]: true;
  title: string;
  tags: TrieveTag[] | undefined;
  selectedTag: string | undefined;
  setSelectedTag: (tag: string | undefined) => void;
  trackLinkClick: (citation: ChunkMetadata, position: number) => void;
  refreshSuggestions: () => Promise<void>;
};

const convertMessage = (message: TrieveMessage): ThreadMessageLike => {
  return {
    id: message.sort_order.toString(),
    role: message.role === "user" ? "user" : "assistant",
    content: message.content,
  };
};

// const fetchMessages = async (
//   trieve: TrieveSDK,
//   messagesTopicId: string | undefined,
// ) => {
//   if (!messagesTopicId) return [];
//   return trieve.getAllMessagesForTopic({
//     messagesTopicId,
//   });
// };

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

type AssistantRuntimeWithExtras<TExtras> = Omit<AssistantRuntime, "thread"> & {
  thread: Omit<ThreadRuntime, "getState"> & {
    getState(): ThreadState & {
      extras: TExtras;
    };
  };
};

type TrieveTag = {
  name: string;
  value: string;
};

export const useTrieveRuntime = ({
  trieve,
  ownerId,
  tags,
  search_type,
}: {
  trieve: TrieveSDK;
  ownerId: string;
  tags?: TrieveTag[];
  search_type: SearchMethod;
}) => {
  const [title, setTitle] = useState("");
  const threadIdRef = useRef<string | undefined>();
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState<TrieveMessage[]>([]);
  const [suggestions, setSuggestions] = useState<ThreadSuggestion[]>([]);

  const getFilter = () => {
    return !selectedTag
      ? null
      : {
          must: [
            {
              field: "tag_set",
              match_all: [selectedTag],
            },
          ],
        };
  };

  const withRunning = useCallback(async <T,>(promise: Promise<T>) => {
    setSuggestions([]);
    setIsRunning(true);
    try {
      return await promise;
    } finally {
      setIsRunning(false);
    }
  }, []);

  const fetchSuggestions = useCallbackRef(async (query: string | null) => {
    const suggestions = (
      await trieve.suggestedQueries({
        query,
        search_type,
      })
    ).queries;
    setSuggestions(suggestions.slice(0, 3).map((d) => ({ prompt: d })));
  });

  useEffect(() => {
    // fetchMessages(trieve, undefined).then((data) => {
    //   setMessages(data);
    // });
    fetchSuggestions(null);
  }, [fetchSuggestions]);

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

  const [selectedTag, setSelectedTag] = useState<string | undefined>();

  const trackLinkClick = useCallbackRef(
    (citation: ChunkMetadata, position: number) => {
      trieve.sendCTRAnalytics({
        ctr_type: "search",
        position: position,
        request_id: "",
        clicked_chunk_id: citation.id,
        clicked_chunk_tracking_id: citation.tracking_id ?? null,
      });
    },
  );

  const refreshSuggestions = useCallbackRef(async () => {
    await fetchSuggestions(null);
  });

  const runtime = useExternalStoreRuntime({
    isRunning,
    messages,
    extras: useMemo(
      () =>
        ({
          [symbolTrieveExtras]: true,
          title,
          tags,
          selectedTag,
          setSelectedTag,
          trackLinkClick,
          refreshSuggestions,
        }) satisfies TrieveExtras,
      [title, tags, selectedTag, trackLinkClick, refreshSuggestions],
    ),
    convertMessage,
    onNew: async ({ content }) => {
      const userMessage = content
        .filter((m) => m.type === "text")
        .map((m) => m.text)
        .join("\n\n");

      setSuggestions([]);
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
            search_type,
            filters: getFilter(),
          })
          .then(toTrieveStream)
          .then(handleStream),
      );
      fetchSuggestions(userMessage);
    },
    onEdit: async ({ content, parentId }) => {
      const userMessage = content
        .filter((m) => m.type === "text")
        .map((m) => m.text)
        .join("\n\n");

      let message_sort_order = 0;
      setSuggestions([]);
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
            filters: getFilter(),
          })
          .then(toTrieveStream)
          .then(handleStream),
      );

      fetchSuggestions(userMessage);
    },

    onReload: async () => {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          ...prev[prev.length - 1]!,
          content: "",
          citations: undefined,
          filters: getFilter(),
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
  return useThread((t) => {
    const extras = t.extras as TrieveExtras;
    if (!extras[symbolTrieveExtras])
      throw new Error(
        "useTrieveExtras can only be used inside a Trieve runtime",
      );

    return selector(extras);
  });
}

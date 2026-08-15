"use client";

import { resource, useResource } from "@assistant-ui/tap";
import { useMemo, useState } from "react";
import { Chat, type UIMessage } from "@ai-sdk/react";
import {
  InMemoryThreadList,
  inMemoryThreadListTransformScopes,
} from "@assistant-ui/core/store";
import { ThreadClient } from "@assistant-ui/core/store/internal";
import { attachTransformScopes } from "@assistant-ui/store/client";
import { AssistantChatTransport } from "../transport/AssistantChatTransport";
import { useChatThread, type ChatThreadOptions } from "./useChatThread";

export type AISDKThreadsOptions<UI_MESSAGE extends UIMessage = UIMessage> =
  Omit<ChatThreadOptions<UI_MESSAGE>, "id" | "chat">;

const useAISDKChatThread = <UI_MESSAGE extends UIMessage = UIMessage>({
  threadId,
  options,
  chats,
}: {
  threadId: string;
  options: AISDKThreadsOptions<UI_MESSAGE> | undefined;
  chats: Map<string, Chat<UI_MESSAGE>>;
}) => {
  // State lives on the chat instance, so a switched-away thread keeps its
  // history and an in-flight run keeps streaming; the mounted resource is
  // only the main thread's subscriber.
  let chat = chats.get(threadId);
  if (!chat) {
    chat = new Chat<UI_MESSAGE>({
      id: threadId,
      transport: options?.transport ?? new AssistantChatTransport(),
      ...(options?.messages !== undefined && { messages: options.messages }),
    });
    chats.set(threadId, chat);
  }

  // The thread is its own chat: the handed-over item initializes to the
  // thread id so the transport resolves it as the request id.
  const threadListItem = useMemo(
    () => ({
      initialize: async () => ({
        remoteId: threadId,
        externalId: undefined,
      }),
    }),
    [threadId],
  );
  const runtime = useChatThread(
    { ...options, chat },
    {
      id: threadId,
      isMainThread: true,
      getThreadListItem: () => threadListItem,
    },
  );
  return useResource(ThreadClient({ runtime: runtime.thread }));
};

const AISDKChatThread = resource(useAISDKChatThread);

const useAISDKThreads = <UI_MESSAGE extends UIMessage = UIMessage>(
  options?: AISDKThreadsOptions<UI_MESSAGE>,
) => {
  const [chats] = useState(() => new Map<string, Chat<UI_MESSAGE>>());

  return useResource(
    InMemoryThreadList({
      thread: (threadId) => AISDKChatThread({ threadId, options, chats }),
    }),
  );
};

/**
 * `AuiConfig` entry that runs one AI SDK chat per thread behind an in-memory
 * thread list. Hosts the same per-thread orchestration as {@link AISDKChat}
 * inside the client's own resource tree, so it works with any
 * `AssistantClient` host, React or not. Threads live in memory for the
 * client's lifetime and keep their history across switches; each thread's
 * chat id is its thread id. The assistant-cloud thread list stays on
 * `useChatRuntime`.
 */
export const AISDKThreads = resource(useAISDKThreads);

attachTransformScopes(useAISDKThreads, inMemoryThreadListTransformScopes);

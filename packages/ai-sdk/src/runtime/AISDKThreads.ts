"use client";

import { resource, useResource } from "@assistant-ui/tap";
import { useMemo, useState } from "react";
import { Chat, type UIMessage } from "@ai-sdk/react";
import type { ChatTransport } from "ai";
import {
  InMemoryThreadList,
  inMemoryThreadListTransformScopes,
} from "@assistant-ui/core/store";
import { ThreadClient } from "@assistant-ui/core/store/internal";
import {
  attachTransformScopes,
  useAssistantClientRef,
  useAssistantScopeEffect,
} from "@assistant-ui/store/client";
import { AssistantChatTransport } from "../transport/AssistantChatTransport";
import {
  splitChatThreadOptions,
  useChatThread,
  type ChatThreadOptions,
} from "./useChatThread";
import { useResourceCleanup } from "./useResourceCleanup";

export type AISDKThreadsOptions<UI_MESSAGE extends UIMessage = UIMessage> =
  Omit<ChatThreadOptions<UI_MESSAGE>, "id" | "transport" | "messages"> & {
    /**
     * The transport threads send through. A factory is invoked once per
     * thread so each thread owns its instance. A plain
     * `AssistantChatTransport` instance is cloned per thread (its
     * assistant-ui wiring is per thread); any other transport instance is
     * shared as-is. Defaults to one `AssistantChatTransport` per thread.
     */
    transport?:
      | ChatTransport<UI_MESSAGE>
      | (() => ChatTransport<UI_MESSAGE>)
      | undefined;
  };

const useAISDKChatThread = <UI_MESSAGE extends UIMessage = UIMessage>({
  threadId,
  options,
  chats,
}: {
  threadId: string;
  options: AISDKThreadsOptions<UI_MESSAGE> | undefined;
  chats: Map<
    string,
    { chat: Chat<UI_MESSAGE>; transport: ChatTransport<UI_MESSAGE> }
  >;
}) => {
  // State lives on the chat instance, so a switched-away thread keeps its
  // history and an in-flight run keeps streaming; the mounted resource is
  // only the main thread's subscriber. The chat's own transport doubles as
  // the wired one below, so model context and the thread item reach the
  // wire.
  let entry = chats.get(threadId);
  if (!entry) {
    const { chatInit } = splitChatThreadOptions(
      options as ChatThreadOptions<UI_MESSAGE> | undefined,
    );
    // A factory result is already per thread. A plain AssistantChatTransport
    // instance is cloned per thread: the docs teach the instance form, and
    // per-thread wiring on a shared instance would leak the visible thread's
    // context into background sends.
    const transport =
      typeof options?.transport === "function"
        ? options.transport()
        : options?.transport === undefined
          ? new AssistantChatTransport()
          : options.transport instanceof AssistantChatTransport
            ? options.transport.__internal_clone()
            : options.transport;
    entry = {
      chat: new Chat<UI_MESSAGE>({ ...chatInit, id: threadId, transport }),
      transport,
    };
    chats.set(threadId, entry);
  }
  const { chat, transport } = entry;

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
    { ...options, transport } as ChatThreadOptions<UI_MESSAGE>,
    {
      id: threadId,
      isMainThread: true,
      getThreadListItem: () => threadListItem,
      chat,
    },
  );

  const clientRef = useAssistantClientRef();
  useAssistantScopeEffect(
    "modelContext",
    () =>
      runtime.registerModelContextProvider(clientRef.current!.modelContext()),
    [runtime],
  );

  return useResource(ThreadClient({ runtime: runtime.thread }));
};

const AISDKChatThread = resource(useAISDKChatThread);

const useAISDKThreads = <UI_MESSAGE extends UIMessage = UIMessage>(
  options?: AISDKThreadsOptions<UI_MESSAGE>,
) => {
  const [chats] = useState(
    () =>
      new Map<
        string,
        { chat: Chat<UI_MESSAGE>; transport: ChatTransport<UI_MESSAGE> }
      >(),
  );

  useResourceCleanup(true, () => {
    for (const { chat } of chats.values()) {
      void chat.stop().catch(() => {});
    }
  });

  return useResource(
    InMemoryThreadList({
      thread: (threadId) => AISDKChatThread({ threadId, options, chats }),
      onDelete: (threadId) => {
        void chats
          .get(threadId)
          ?.chat.stop()
          .catch(() => {});
        chats.delete(threadId);
      },
    }),
  );
};

/**
 * `AuiConfig` entry that runs one AI SDK chat per thread behind an in-memory
 * thread list. Hosts the same per-thread orchestration as {@link AISDKChat}
 * inside the client's own resource tree, so it works with any
 * `AssistantClient` host, React or not. Threads live in memory for the
 * client's lifetime and keep their history across switches; each thread's
 * chat id is its thread id. Model context is registered on the visible
 * thread only, so a background send carries no context. The assistant-cloud
 * thread list stays on `useChatRuntime`.
 */
export const AISDKThreads = resource(useAISDKThreads);

attachTransformScopes(useAISDKThreads, inMemoryThreadListTransformScopes);

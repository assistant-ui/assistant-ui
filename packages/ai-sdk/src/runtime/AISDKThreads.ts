"use client";

import { resource, useResource, withKey } from "@assistant-ui/tap";
import { useEffect, useMemo, useState } from "react";
import { Chat, type UIMessage } from "@ai-sdk/react";
import type { ChatTransport } from "ai";
import type { AssistantCloud } from "assistant-cloud";
import {
  InMemoryThreadList,
  RemoteThreadList,
  inMemoryThreadListTransformScopes,
} from "@assistant-ui/core/store";
import { ThreadClient } from "@assistant-ui/core/store/internal";
import { useCloudThreadListAdapter } from "@assistant-ui/core/react";
import {
  attachTransformScopes,
  useAssistantClientRef,
  useAssistantScopeEffect,
} from "@assistant-ui/store/client";
import { useAui } from "@assistant-ui/store";
import { AssistantChatTransport } from "../transport/AssistantChatTransport";
import {
  splitChatThreadOptions,
  useChatThread,
  type ChatThreadOptions,
} from "./useChatThread";
import { MessageRepository } from "@assistant-ui/core/internal";
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
    /**
     * When set, the thread list is a `RemoteThreadList` backed by this
     * assistant-cloud. Omit it to keep the in-memory list. The thread
     * factory is keyed so cloud history reloads on a switch, and an
     * in-flight run does not continue in the background.
     */
    cloud?: AssistantCloud | undefined;
    /**
     * Controlled thread id for the cloud list. Ignored without `cloud`.
     */
    threadId?: string | undefined;
    /**
     * Called with the settled remote id when the cloud list changes thread.
     */
    onThreadIdChange?: ((threadId: string | undefined) => void) | undefined;
  };

type AISDKThreadChatOptions<UI_MESSAGE extends UIMessage = UIMessage> = Omit<
  AISDKThreadsOptions<UI_MESSAGE>,
  "cloud" | "threadId" | "onThreadIdChange"
>;

type ChatEntry<UI_MESSAGE extends UIMessage> = {
  chat: Chat<UI_MESSAGE>;
  transport: ChatTransport<UI_MESSAGE>;
  repository: MessageRepository;
};

const createChatEntry = <UI_MESSAGE extends UIMessage>(
  threadId: string,
  options: AISDKThreadChatOptions<UI_MESSAGE> | undefined,
): ChatEntry<UI_MESSAGE> => {
  const { chatInit } = splitChatThreadOptions(
    options as ChatThreadOptions<UI_MESSAGE> | undefined,
  );
  const transport =
    typeof options?.transport === "function"
      ? options.transport()
      : options?.transport === undefined
        ? new AssistantChatTransport()
        : options.transport instanceof AssistantChatTransport
          ? options.transport.__internal_clone()
          : options.transport;
  return {
    chat: new Chat<UI_MESSAGE>({ ...chatInit, id: threadId, transport }),
    transport,
    repository: new MessageRepository(),
  };
};

const getOrCreateChatEntry = <UI_MESSAGE extends UIMessage>(
  threadId: string,
  options: AISDKThreadChatOptions<UI_MESSAGE> | undefined,
  chats: Map<string, ChatEntry<UI_MESSAGE>>,
): ChatEntry<UI_MESSAGE> => {
  const existing = chats.get(threadId);
  if (existing) return existing;
  const created = createChatEntry(threadId, options);
  chats.set(threadId, created);
  return created;
};

const useAISDKChatThread = <UI_MESSAGE extends UIMessage = UIMessage>({
  threadId,
  options,
  chats,
  cloud,
}: {
  threadId: string;
  options: AISDKThreadChatOptions<UI_MESSAGE> | undefined;
  chats: Map<string, ChatEntry<UI_MESSAGE>>;
  cloud: boolean;
}) => {
  const [owned] = useState(() =>
    cloud ? createChatEntry(threadId, options) : undefined,
  );
  const { chat, transport, repository } =
    owned ?? getOrCreateChatEntry(threadId, options, chats);

  useEffect(() => {
    if (!cloud) return undefined;
    return () => {
      void chat.stop().catch(() => {});
    };
  }, [chat, cloud]);

  const aui = useAui();
  const fallbackItem = useMemo(
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
      getThreadListItem: () =>
        cloud
          ? aui.threadListItem.source
            ? aui.threadListItem
            : undefined
          : fallbackItem,
      chat,
      messageRepositoryInstance: repository,
      stopOnClientDestroy: cloud,
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
  const { cloud, threadId, onThreadIdChange, ...threadOptions } = options ?? {};
  const [chats] = useState(() => new Map<string, ChatEntry<UI_MESSAGE>>());
  const bindCloud = cloud !== undefined;

  useResourceCleanup(true, () => {
    for (const { chat } of chats.values()) {
      void chat.stop().catch(() => {});
    }
  });

  const cloudAdapter = useCloudThreadListAdapter({ cloud });
  const thread = (id: string) => {
    const element = AISDKChatThread({
      threadId: id,
      options: threadOptions,
      chats,
      cloud: bindCloud,
    });
    return bindCloud ? withKey(id, element) : element;
  };

  return useResource(
    bindCloud
      ? RemoteThreadList({
          adapter: cloudAdapter,
          thread,
          threadId,
          onThreadIdChange,
        })
      : InMemoryThreadList({
          thread,
          onDelete: (id) => {
            void chats
              .get(id)
              ?.chat.stop()
              .catch(() => {});
            chats.delete(id);
          },
        }),
  );
};

/**
 * `AuiConfig` entry that runs one AI SDK chat per thread. Hosts the same
 * per-thread orchestration as {@link AISDKChat} inside the client's own
 * resource tree, so it works with any `AssistantClient` host, React or not.
 * Without `cloud`, threads live in memory for the client's lifetime and keep
 * their history across switches; each thread's chat id is its thread id.
 * With `cloud`, the list is a `RemoteThreadList` and the factory is keyed so
 * cloud history reloads on a switch. The store entry mounts only the visible
 * thread, so a switch cancels an in-flight run. Model context is
 * registered on the visible thread only.
 */
export const AISDKThreads = resource(useAISDKThreads);

attachTransformScopes(useAISDKThreads, inMemoryThreadListTransformScopes);

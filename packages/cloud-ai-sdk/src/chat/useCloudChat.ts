"use client";

import { useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { AssistantCloud } from "assistant-cloud";
import type {
  UseCloudChatOptions,
  UseCloudChatResult,
  UseThreadsResult,
} from "../types";
import { useThreads } from "../threads/useThreads";
import { useChatRegistry } from "./useChatRegistry";
import { useCloudChatCore } from "./useCloudChatCore";
import type { ChatRegistry } from "./ChatRegistry";
import type { CloudChatCore } from "../core/CloudChatCore";

const autoCloudBaseUrl =
  typeof process !== "undefined"
    ? process.env["NEXT_PUBLIC_ASSISTANT_BASE_URL"]
    : undefined;
const autoCloud = autoCloudBaseUrl
  ? new AssistantCloud({ baseUrl: autoCloudBaseUrl, anonymous: true })
  : undefined;

export function useCloudChat(
  options: UseCloudChatOptions = {},
): UseCloudChatResult {
  const {
    threads: externalThreads,
    cloud: explicitCloud,
    onSyncError,
    transport,
    ...chatConfig
  } = options;

  const cloud = useResolvedCloud(externalThreads, explicitCloud);

  const ownThreads = useThreads({ cloud, enabled: !externalThreads });
  const threads = externalThreads ?? ownThreads;

  const core = useCloudChatCore(threads.cloud, {
    threads,
    chatConfig,
    onSyncError,
    transport,
  });

  const { registry, activeChat } = useChatRegistry({
    threadId: threads.threadId,
    createChat: (chatKey, reg) => core.createChat(chatKey, reg),
  });

  useThreadMessageLoader(threads.threadId, registry, core);

  const chat = useChat({ chat: activeChat });

  return { ...chat, threads };
}

function useResolvedCloud(
  externalThreads: UseThreadsResult | undefined,
  explicitCloud: AssistantCloud | undefined,
): AssistantCloud {
  return useMemo(() => {
    if (externalThreads) return externalThreads.cloud;
    if (explicitCloud) return explicitCloud;
    if (!autoCloud) {
      throw new Error(
        "useCloudChat: No cloud configured. Either:\n" +
          "1. Set NEXT_PUBLIC_ASSISTANT_BASE_URL environment variable, or\n" +
          "2. Pass a cloud instance: useCloudChat({ cloud }), or\n" +
          "3. Pass threads from useThreads: useCloudChat({ threads })",
      );
    }
    return autoCloud;
  }, [externalThreads, explicitCloud]);
}

function useThreadMessageLoader(
  threadId: string | null,
  registry: ChatRegistry,
  core: CloudChatCore,
): void {
  useEffect(() => {
    if (!threadId) return;

    const chatKey = registry.getChatKeyForThread(threadId) ?? threadId;
    const meta = registry.getOrCreateMeta(chatKey, threadId);

    if (meta.loaded || meta.loading) {
      return;
    }

    const cancelledRef = { cancelled: false };
    meta.loading = core.loadThreadMessages(
      threadId,
      chatKey,
      registry,
      cancelledRef,
    );

    return () => {
      cancelledRef.cancelled = true;
    };
  }, [threadId, registry, core]);
}

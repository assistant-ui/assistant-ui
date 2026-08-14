"use client";

import { resource, useResource } from "@assistant-ui/tap";
import { useState } from "react";
import { generateId } from "ai";
import type { UIMessage } from "@ai-sdk/react";
import {
  RuntimeAdapter,
  runtimeAdapterTransformScopes,
} from "@assistant-ui/core/store";
import {
  attachTransformScopes,
  useAssistantClientRef,
} from "@assistant-ui/store/client";
import { useChatThread, type ChatThreadOptions } from "./useChatThread";

export type AISDKChatOptions<UI_MESSAGE extends UIMessage = UIMessage> =
  ChatThreadOptions<UI_MESSAGE>;

const useAISDKChat = <UI_MESSAGE extends UIMessage = UIMessage>(
  options?: AISDKChatOptions<UI_MESSAGE>,
) => {
  const clientRef = useAssistantClientRef();
  const [id] = useState(() => options?.id ?? generateId());
  const runtime = useChatThread(options, {
    id,
    isMainThread: true,
    getThreadListItem: () => {
      const client = clientRef.current;
      if (!client) return undefined;
      return client.threadListItem.source ? client.threadListItem : undefined;
    },
  });
  return useResource(RuntimeAdapter(runtime));
};

/**
 * `AuiConfig` entry that runs the AI SDK chat as the `threads` scope. Hosts the
 * same orchestration as `useChatRuntime` inside the client's own resource tree,
 * so it works with any `AssistantClient` host, React or not. Single thread; the
 * multi-thread and assistant-cloud surface stays on `useChatRuntime`.
 */
export const AISDKChat = resource(useAISDKChat);

attachTransformScopes(useAISDKChat, runtimeAdapterTransformScopes);

"use client";

import { resource, useResource } from "@assistant-ui/tap";
import { useState } from "react";
import { generateId } from "ai";
import type { UIMessage } from "@ai-sdk/react";
import {
  RuntimeAdapter,
  runtimeAdapterTransformScopes,
} from "@assistant-ui/core/store";
import { attachTransformScopes } from "@assistant-ui/store/client";
import { useChatThread, type ChatThreadOptions } from "./useChatThread";

export type AISDKChatOptions<UI_MESSAGE extends UIMessage = UIMessage> =
  ChatThreadOptions<UI_MESSAGE>;

const useAISDKChat = <UI_MESSAGE extends UIMessage = UIMessage>(
  options?: AISDKChatOptions<UI_MESSAGE>,
) => {
  const [id] = useState(() => options?.id ?? generateId());
  // The transport resolves the request id from the thread list item, falling
  // back to the runtime's main item, whose id here is the external store's
  // placeholder constant. The single thread of this entry is the chat itself,
  // so the handed-over item initializes to the chat id.
  const [threadListItem] = useState(() => ({
    initialize: async () => ({ remoteId: id, externalId: undefined }),
  }));
  const runtime = useChatThread(options, {
    id,
    isMainThread: true,
    getThreadListItem: () => threadListItem,
    stopOnClientDestroy: true,
  });
  return useResource(RuntimeAdapter(runtime));
};

/**
 * `AuiConfig` entry that runs the AI SDK chat as the `threads` scope. Hosts the
 * same orchestration as `useChatRuntime` inside the client's own resource tree,
 * so it works with any `AssistantClient` host, React or not. Single thread; the
 * multi-thread and assistant-cloud surface stays on `useChatRuntime`. The chat
 * id is captured when the entry mounts, so a later `id` change in the options
 * has no effect.
 */
export const AISDKChat = resource(useAISDKChat);

attachTransformScopes(useAISDKChat, runtimeAdapterTransformScopes);

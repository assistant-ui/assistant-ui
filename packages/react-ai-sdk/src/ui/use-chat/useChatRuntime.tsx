"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import type { AssistantCloud } from "assistant-cloud";
import {
  AssistantRuntime,
  unstable_useCloudThreadListAdapter,
  unstable_useRemoteThreadListRuntime,
  useRuntimeAdapters,
} from "@assistant-ui/react";
import { useAISDKRuntime, type AISDKRuntimeAdapter } from "./useAISDKRuntime";
import { ChatInit } from "ai";
import { AssistantChatTransport } from "./AssistantChatTransport";

export type UseChatRuntimeOptions<UI_MESSAGE extends UIMessage = UIMessage> =
  ChatInit<UI_MESSAGE> & {
    cloud?: AssistantCloud | undefined;
    adapters?: AISDKRuntimeAdapter["adapters"] | undefined;
  };

export const useChatThreadRuntime = <UI_MESSAGE extends UIMessage = UIMessage>(
  options?: UseChatRuntimeOptions<UI_MESSAGE>,
): AssistantRuntime => {
  const {
    adapters,
    transport: transportOptions,
    ...chatOptions
  } = options ?? {};
  const transport = transportOptions ?? new AssistantChatTransport();

  // Get adapters from context (including history adapter from cloud)
  const contextAdapters = useRuntimeAdapters();

  const chat = useChat({
    ...chatOptions,
    transport,
  });

  const runtime = useAISDKRuntime(chat as any, {
    adapters: {
      ...contextAdapters,
      ...adapters,
    },
  });
  if (transport instanceof AssistantChatTransport) {
    transport.setRuntime(runtime);
  }

  return runtime;
};

export const useChatRuntime = <UI_MESSAGE extends UIMessage = UIMessage>({
  cloud,
  ...options
}: UseChatRuntimeOptions<UI_MESSAGE> = {}): AssistantRuntime => {
  const cloudAdapter = unstable_useCloudThreadListAdapter({ cloud });
  return unstable_useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useChatThreadRuntime(options);
    },
    adapter: cloudAdapter,
  });
};

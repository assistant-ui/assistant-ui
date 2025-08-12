"use client";

import { useChat, type UIMessage, type UseChatOptions } from "@ai-sdk/react";

import { useAISDKRuntime } from "./useAISDKRuntime";

export const useChatRuntime = <UI_MESSAGE extends UIMessage = UIMessage>(
  options?: UseChatOptions<UI_MESSAGE>,
) => {
  const chat = useChat(options);
  const runtime = useAISDKRuntime(chat as any);
  return runtime;
};

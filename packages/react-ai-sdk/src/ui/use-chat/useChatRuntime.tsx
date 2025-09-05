"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import type { AssistantCloud } from "assistant-cloud";
import {
  AssistantRuntime,
  unstable_useCloudThreadListAdapter,
  unstable_useRemoteThreadListRuntime,
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

  const chat = useChat({
    ...chatOptions,
    transport,
    onToolCall: async ({ toolCall }) => {
      await chatOptions.onToolCall?.({ toolCall });

      const tools = runtime.thread.getModelContext().tools;
      const tool = tools?.[toolCall.toolName];
      if (tool) {
        try {
          const result = await tool.execute?.(toolCall.input, {
            toolCallId: toolCall.toolCallId,
            abortSignal: new AbortController().signal, // dummy signal for now
          });
          chat.addToolResult({
            tool: toolCall.toolName,
            toolCallId: toolCall.toolCallId,
            output: result,
          });
        } catch (error) {
          chat.addToolResult({
            tool: toolCall.toolName,
            toolCallId: toolCall.toolCallId,
            output: {
              error: error instanceof Error ? error.message : String(error),
            },
          });
        }
      }
    },
  });

  const runtime = useAISDKRuntime(chat as any, {
    adapters,
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

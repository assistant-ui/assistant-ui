"use client";

import { z } from "zod";
import { useChat, type UIMessage } from "@ai-sdk/react";
import type { AssistantCloud } from "assistant-cloud";
import {
  AssistantRuntime,
  Tool,
  unstable_useCloudThreadListAdapter,
  unstable_useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import { useAISDKRuntime, type AISDKRuntimeAdapter } from "./useAISDKRuntime";
import { ChatInit, DefaultChatTransport, JSONSchema7 } from "ai";

export type UseChatRuntimeOptions<UI_MESSAGE extends UIMessage = UIMessage> =
  ChatInit<UI_MESSAGE> & {
    cloud?: AssistantCloud | undefined;
    adapters?: AISDKRuntimeAdapter["adapters"] | undefined;
  };

const toAISDKTools = (tools: Record<string, Tool>) => {
  return Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [
      name,
      {
        ...(tool.description ? { description: tool.description } : undefined),
        parameters: (tool.parameters instanceof z.ZodType
          ? z.toJSONSchema(tool.parameters)
          : tool.parameters) as JSONSchema7,
      },
    ]),
  );
};

const getEnabledTools = (tools: Record<string, Tool>) => {
  return Object.fromEntries(
    Object.entries(tools).filter(
      ([, tool]) => !tool.disabled && tool.type !== "backend",
    ),
  );
};

export const useChatThreadRuntime = <UI_MESSAGE extends UIMessage = UIMessage>(
  options?: UseChatRuntimeOptions<UI_MESSAGE>,
): AssistantRuntime => {
  const { adapters, ...chatOptions } = options ?? {};
  const chat = useChat({
    ...chatOptions,
    transport:
      chatOptions.transport ??
      new DefaultChatTransport({
        prepareSendMessagesRequest(opt) {
          const context = runtime.thread.getModelContext();
          return {
            body: {
              system: context?.system,
              tools: toAISDKTools(getEnabledTools(context.tools ?? {})),
              ...opt.body,
            },
          };
        },
      }),
  });
  const runtime = useAISDKRuntime(chat as any, { adapters });
  return runtime;
};

export const useChatRuntime = <UI_MESSAGE extends UIMessage = UIMessage>({
  cloud,
  ...options
}: UseChatRuntimeOptions<UI_MESSAGE>): AssistantRuntime => {
  const cloudAdapter = unstable_useCloudThreadListAdapter({ cloud });
  return unstable_useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useChatThreadRuntime(options);
    },
    adapter: cloudAdapter,
  });
};

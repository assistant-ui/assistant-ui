"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import type { AssistantCloud } from "assistant-cloud";
import type { AssistantRuntime } from "@assistant-ui/core";
import {
  useCloudThreadListAdapter,
  useRemoteThreadListRuntime,
} from "@assistant-ui/core/react";
import { useAui, useAuiState } from "@assistant-ui/store";
import {
  useAISDKRuntime,
  type AISDKRuntimeAdapter,
  type CustomToCreateMessageFunction,
} from "./useAISDKRuntime";
import type { ChatInit, ChatTransport } from "ai";
import { AssistantChatTransport } from "./AssistantChatTransport";
import { useEffect, useMemo, useRef } from "react";

export type UseChatRuntimeOptions<UI_MESSAGE extends UIMessage = UIMessage> =
  ChatInit<UI_MESSAGE> & {
    cloud?: AssistantCloud | undefined;
    adapters?: AISDKRuntimeAdapter["adapters"] | undefined;
    toCreateMessage?: CustomToCreateMessageFunction;
  };

const useDynamicChatTransport = <UI_MESSAGE extends UIMessage = UIMessage>(
  transport: ChatTransport<UI_MESSAGE>,
): ChatTransport<UI_MESSAGE> => {
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const transportRef = useRef<ChatTransport<UI_MESSAGE>>(transport);
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  useEffect(() => {
    transportRef.current = transport;
  });
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const dynamicTransport = useMemo(
    () =>
      new Proxy(transportRef.current, {
        get(_, prop) {
          const res =
            transportRef.current[prop as keyof ChatTransport<UI_MESSAGE>];
          return typeof res === "function"
            ? res.bind(transportRef.current)
            : res;
        },
      }),
    [],
  );
  return dynamicTransport;
};

const useChatThreadRuntime = <UI_MESSAGE extends UIMessage = UIMessage>(
  options?: UseChatRuntimeOptions<UI_MESSAGE>,
): AssistantRuntime => {
  const {
    adapters,
    transport: transportOptions,
    toCreateMessage,
    ...chatOptions
  } = options ?? {};

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const transport = useDynamicChatTransport(
    transportOptions ?? new AssistantChatTransport(),
  );

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const id = useAuiState((s) => s.threadListItem.id);
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const aui = useAui();
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const chat = useChat({
    ...chatOptions,
    id,
    transport,
  });

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const runtime = useAISDKRuntime(chat, {
    adapters,
    ...(toCreateMessage && { toCreateMessage }),
  });

  if (transport instanceof AssistantChatTransport) {
    transport.setRuntime(runtime);
    transport.__internal_setGetThreadListItem(() =>
      aui.threadListItem.source ? aui.threadListItem() : undefined,
    );
  }

  return runtime;
};

export const useChatRuntime = <UI_MESSAGE extends UIMessage = UIMessage>({
  cloud,
  ...options
}: UseChatRuntimeOptions<UI_MESSAGE> = {}): AssistantRuntime => {
  const cloudAdapter = useCloudThreadListAdapter({ cloud });
  return useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
      return useChatThreadRuntime(options);
    },
    adapter: cloudAdapter,
    allowNesting: true,
  });
};

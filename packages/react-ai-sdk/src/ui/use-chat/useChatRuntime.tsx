"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import type { AssistantCloud } from "assistant-cloud";
import {
  AssistantRuntime,
  unstable_useCloudThreadListAdapter,
  unstable_useRemoteThreadListRuntime,
  useAuiState,
} from "@assistant-ui/react";
import {
  useAISDKRuntime,
  type AISDKRuntimeAdapter,
  type CustomToCreateMessageFunction,
} from "./useAISDKRuntime";
import { ChatInit, ChatTransport } from "ai";
import { AssistantChatTransport } from "./AssistantChatTransport";
import { useEffect, useMemo, useRef } from "react";

export type UseChatRuntimeOptions<UI_MESSAGE extends UIMessage = UIMessage> =
  ChatInit<UI_MESSAGE> & {
    cloud?: AssistantCloud | undefined;
    adapters?: AISDKRuntimeAdapter["adapters"] | undefined;
    toCreateMessage?: CustomToCreateMessageFunction;
    cancelPendingToolCallsOnSend?:
      | AISDKRuntimeAdapter["cancelPendingToolCallsOnSend"]
      | undefined;
    onComponentInvoke?: AISDKRuntimeAdapter["onComponentInvoke"] | undefined;
    onComponentEmit?: AISDKRuntimeAdapter["onComponentEmit"] | undefined;
    /**
     * Experimental json-render compatibility lane.
     * This option is unstable and may change without notice.
     */
    unstable_dataSpec?: AISDKRuntimeAdapter["unstable_dataSpec"] | undefined;
  };

const useDynamicChatTransport = <UI_MESSAGE extends UIMessage = UIMessage>(
  transport: ChatTransport<UI_MESSAGE>,
): ChatTransport<UI_MESSAGE> => {
  const transportRef = useRef<ChatTransport<UI_MESSAGE>>(transport);
  useEffect(() => {
    transportRef.current = transport;
  });
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
    cancelPendingToolCallsOnSend,
    onComponentInvoke,
    onComponentEmit,
    unstable_dataSpec,
    ...chatOptions
  } = options ?? {};

  const transport = useDynamicChatTransport(
    transportOptions ?? new AssistantChatTransport(),
  );

  const id = useAuiState((s) => s.threadListItem.id);
  const chat = useChat({
    ...chatOptions,
    id,
    transport,
  });

  const runtime = useAISDKRuntime(chat, {
    adapters,
    ...(toCreateMessage && { toCreateMessage }),
    ...(cancelPendingToolCallsOnSend !== undefined && {
      cancelPendingToolCallsOnSend,
    }),
    ...(onComponentInvoke && { onComponentInvoke }),
    ...(onComponentEmit && { onComponentEmit }),
    ...(unstable_dataSpec && { unstable_dataSpec }),
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
    allowNesting: true,
  });
};

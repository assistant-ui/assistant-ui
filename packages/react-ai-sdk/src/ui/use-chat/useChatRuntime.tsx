/** biome-ignore-all lint/correctness/useHookAtTopLevel: <explanation> */
"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import type { AssistantCloud } from "assistant-cloud";
import {
  type AssistantRuntime,
  unstable_useCloudThreadListAdapter,
  unstable_useRemoteThreadListRuntime,
  useAssistantState,
} from "@assistant-ui/react";
import {
  useAISDKRuntime,
  type AISDKRuntimeAdapter,
  type CustomToCreateMessageFunction,
} from "./useAISDKRuntime";
import type { ChatInit } from "ai";
import { AssistantChatTransport } from "./AssistantChatTransport";
import { useMemo, useRef } from "react";

export type UseChatRuntimeOptions<UI_MESSAGE extends UIMessage = UIMessage> =
  ChatInit<UI_MESSAGE> & {
    cloud?: AssistantCloud | undefined;
    adapters?: AISDKRuntimeAdapter["adapters"] | undefined;
    toCreateMessage?: CustomToCreateMessageFunction;
    /**
     * Extra body object to be sent with the API request.
     * This will be merged with the default request body.
     *
     * Note: The body can be updated dynamically without recreating the runtime.
     * @example
     * ```tsx
     * const [temperature, setTemperature] = useState(0.7);
     * const runtime = useChatRuntime({
     *   body: { temperature }
     * });
     * ```
     */
    body?: object | undefined;
  };

export const useChatThreadRuntime = <UI_MESSAGE extends UIMessage = UIMessage>(
  options?: UseChatRuntimeOptions<UI_MESSAGE>,
): AssistantRuntime => {
  const {
    adapters,
    transport: transportOptions,
    toCreateMessage,
    body,
    ...chatOptions
  } = options ?? {};

  const bodyRef = useRef(body);
  bodyRef.current = body;

  const transport = useMemo(() => {
    const newTransport = transportOptions ?? new AssistantChatTransport();

    if (!transportOptions && newTransport instanceof AssistantChatTransport) {
      newTransport.__internal_setDynamicBodyRef(bodyRef);
    }

    return newTransport;
  }, [transportOptions]);

  const id = useAssistantState(({ threadListItem }) => threadListItem.id);
  const chat = useChat({
    ...chatOptions,
    id,
    transport,
  });

  const runtime = useAISDKRuntime(chat, {
    adapters,
    ...(toCreateMessage && { toCreateMessage }),
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

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
import type { AssistantChatResumableOptions } from "../resumable";
import { useEffect, useMemo, useRef } from "react";

export type UseChatRuntimeOptions<UI_MESSAGE extends UIMessage = UIMessage> =
  ChatInit<UI_MESSAGE> & {
    cloud?: AssistantCloud | undefined;
    adapters?: AISDKRuntimeAdapter["adapters"] | undefined;
    toCreateMessage?: CustomToCreateMessageFunction;
    onResume?: AISDKRuntimeAdapter["onResume"];
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

const getResumableAdapter = <UI_MESSAGE extends UIMessage>(
  transport: ChatTransport<UI_MESSAGE>,
): AssistantChatResumableOptions | undefined => {
  if (transport instanceof AssistantChatTransport) {
    return transport.getResumableAdapter();
  }
  const candidate = (transport as { getResumableAdapter?: () => unknown })
    .getResumableAdapter;
  if (typeof candidate !== "function") return undefined;
  return candidate.call(transport) as AssistantChatResumableOptions | undefined;
};

const useChatThreadRuntime = <UI_MESSAGE extends UIMessage = UIMessage>(
  options?: UseChatRuntimeOptions<UI_MESSAGE>,
): AssistantRuntime => {
  const {
    adapters,
    transport: transportOptions,
    toCreateMessage,
    onResume,
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
    ...(onResume && { onResume }),
  });

  if (transport instanceof AssistantChatTransport) {
    transport.setRuntime(runtime);
    transport.__internal_setGetThreadListItem(() =>
      aui.threadListItem.source ? aui.threadListItem() : undefined,
    );
  }

  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  const resumeFiredRef = useRef(false);
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  useEffect(() => {
    if (resumeFiredRef.current) return;
    const adapter = getResumableAdapter(transport);
    if (!adapter) return;
    const pending = adapter.storage.getStreamId();
    if (!pending) return;
    resumeFiredRef.current = true;
    chat.resumeStream().catch((err: unknown) => {
      console.warn(
        "[assistant-ui] resumable: resume failed; clearing stored stream id",
        err,
      );
      adapter.storage.clear();
    });
  }, [transport, chat]);

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

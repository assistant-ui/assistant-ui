"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useChat, type UIMessage } from "@ai-sdk/react";
import {
  AssistantRuntime,
  unstable_useCloudThreadListAdapter,
  unstable_useRemoteThreadListRuntime,
  useAssistantState,
} from "@assistant-ui/react";
import type { AssistantCloud } from "assistant-cloud";
import { ChatInit, ChatTransport } from "ai";

import {
  AssistantChatTransport,
  ChatResumableAdapter,
  ResumableState,
} from "./AssistantChatTransport";
import {
  useAISDKRuntime,
  type AISDKRuntimeAdapter,
  type CustomToCreateMessageFunction,
} from "./useAISDKRuntime";

export type UseChatRuntimeOptions<UI_MESSAGE extends UIMessage = UIMessage> =
  ChatInit<UI_MESSAGE> & {
    cloud?: AssistantCloud | undefined;
    adapters?:
      | (AISDKRuntimeAdapter["adapters"] & {
          resumable?: ChatResumableAdapter | undefined;
        })
      | undefined;
    toCreateMessage?: CustomToCreateMessageFunction;
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

function useChatThreadRuntime<UI_MESSAGE extends UIMessage = UIMessage>(
  options?: UseChatRuntimeOptions<UI_MESSAGE>,
): AssistantRuntime {
  const {
    adapters,
    transport: transportOptions,
    toCreateMessage,
    ...chatOptions
  } = options ?? {};

  const resumableAdapter =
    adapters?.resumable ??
    (transportOptions instanceof AssistantChatTransport
      ? transportOptions.getResumableAdapter()
      : undefined);

  const [pendingResume] = useState<ResumableState<UI_MESSAGE>>(() => {
    const storage = resumableAdapter?.storage;
    if (!storage) return null;

    const streamId = storage.getStreamId();
    const messages = storage.getState<UI_MESSAGE[]>();
    if (streamId && messages && messages.length > 0) {
      return { streamId, messages };
    }
    return null;
  });

  const [transport] = useState<
    AssistantChatTransport<UI_MESSAGE> | ChatTransport<UI_MESSAGE>
  >(
    () =>
      transportOptions ??
      new AssistantChatTransport<UI_MESSAGE>(
        resumableAdapter ? { resumable: resumableAdapter } : undefined,
      ),
  );

  const dynamicTransport = useDynamicChatTransport(transport);
  const pendingResumeTriggeredRef = useRef(false);

  const id = useAssistantState(({ threadListItem }) => threadListItem.id);
  const chat = useChat({
    ...chatOptions,
    id,
    transport: dynamicTransport,
  });

  const runtime = useAISDKRuntime(chat, {
    adapters,
    ...(toCreateMessage && { toCreateMessage }),
  });

  if (transport instanceof AssistantChatTransport) {
    transport.setRuntime(runtime);
  }

  useEffect(() => {
    if (!pendingResume || pendingResumeTriggeredRef.current) return;
    pendingResumeTriggeredRef.current = true;

    if (transport instanceof AssistantChatTransport) {
      transport.setPendingResume(pendingResume);
    }

    resumableAdapter?.onResumingChange?.(true);

    const lastMessage = pendingResume.messages.at(-1);
    const userText =
      lastMessage?.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("") ?? "";

    chat.sendMessage({ text: userText });
  }, [chat, pendingResume, resumableAdapter, transport]);

  return runtime;
}

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

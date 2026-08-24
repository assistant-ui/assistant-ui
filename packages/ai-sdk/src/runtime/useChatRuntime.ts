"use client";

import type { UIMessage } from "@ai-sdk/react";
import type { AssistantCloud } from "assistant-cloud";
import type { AssistantRuntime } from "@assistant-ui/core";
import {
  useCloudThreadListAdapter,
  useRemoteThreadListRuntime,
} from "@assistant-ui/core/react";
import { useAui, useAuiState } from "@assistant-ui/store";
import type { ChatTransport } from "ai";
import { useEffect, useInsertionEffect, useMemo, useState } from "react";
import { AssistantChatTransport } from "../transport/AssistantChatTransport";
import { DynamicChatTransport } from "./DynamicChatTransport";
import { useChatThread, type ChatThreadOptions } from "./useChatThread";

export type UseChatRuntimeOptions<UI_MESSAGE extends UIMessage = UIMessage> =
  Omit<ChatThreadOptions<UI_MESSAGE>, "transport"> & {
    /**
     * The transport threads send through. `AssistantChatTransport` instances
     * are cloned per thread through `__internal_clone()` so their assistant-ui
     * wiring remains isolated. Other transport instances are shared as-is.
     */
    transport?: ChatTransport<UI_MESSAGE> | undefined;
    cloud?: AssistantCloud | undefined;
    onThreadIdChange?: ((threadId: string | undefined) => void) | undefined;
  };

const useDynamicChatTransport = <UI_MESSAGE extends UIMessage>(
  transport: ChatTransport<UI_MESSAGE> | undefined,
): ChatTransport<UI_MESSAGE> => {
  const fallback = useMemo(() => new AssistantChatTransport<UI_MESSAGE>(), []);
  const [dynamicTransport] = useState(
    () => new DynamicChatTransport(transport ?? fallback),
  );

  useInsertionEffect(() => {
    dynamicTransport.setTransport(transport ?? fallback);
  }, [dynamicTransport, fallback, transport]);
  useEffect(() => {
    dynamicTransport.flushTransportChange();
  }, [dynamicTransport, transport]);

  return dynamicTransport;
};

const useChatThreadRuntime = <UI_MESSAGE extends UIMessage = UIMessage>(
  options?: ChatThreadOptions<UI_MESSAGE>,
): AssistantRuntime => {
  const id = useAuiState((s) => s.threadListItem.id);
  const isMainThread = useAuiState(
    (s) => s.threads.mainThreadId === s.threadListItem.id,
  );
  const aui = useAui();
  return useChatThread(options, {
    id,
    isMainThread,
    getThreadListItem: () =>
      aui.threadListItem.source ? aui.threadListItem : undefined,
  });
};

export const useChatRuntime = <UI_MESSAGE extends UIMessage = UIMessage>({
  cloud,
  onThreadIdChange,
  ...options
}: UseChatRuntimeOptions<UI_MESSAGE> = {}): AssistantRuntime => {
  const cloudAdapter = useCloudThreadListAdapter({ cloud });
  const transport = useDynamicChatTransport(options.transport);
  return useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useChatThreadRuntime({ ...options, transport });
    },
    adapter: cloudAdapter,
    allowNesting: true,
    onThreadIdChange,
  });
};

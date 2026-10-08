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
import { useMemo } from "react";
import { AssistantChatTransport } from "../transport/AssistantChatTransport";
import { useChatThread, type ChatThreadOptions } from "./useChatThread";
import { useDynamicChatTransport } from "./useDynamicChatTransport";
import { useHostDestroySignal } from "@assistant-ui/store/internal";
import { AI_SDK_SDK } from "./sdkIdentity";

export type UseChatRuntimeOptions<UI_MESSAGE extends UIMessage = UIMessage> =
  Omit<ChatThreadOptions<UI_MESSAGE>, "transport"> & {
    /**
     * The transport threads send through. `AssistantChatTransport` instances
     * are cloned per thread through `__internal_clone()` so their assistant-ui
     * wiring remains isolated. Other transport instances are shared as-is.
     */
    transport?: ChatTransport<UI_MESSAGE> | undefined;
    cloud?: AssistantCloud | undefined;
    /**
     * Stable identity for the account or workspace owning Cloud runtime state.
     * Provide it from the first render and change it when that scope changes.
     */
    scopeId?: string | undefined;
    onThreadIdChange?: ((threadId: string | undefined) => void) | undefined;
  };

const useChatThreadRuntime = <UI_MESSAGE extends UIMessage = UIMessage>(
  options: ChatThreadOptions<UI_MESSAGE> | undefined,
  hostDestroySignal: AbortSignal,
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
    stopOnClientDestroy: true,
    hostDestroySignal,
  });
};

export const useChatRuntime = <UI_MESSAGE extends UIMessage = UIMessage>({
  cloud,
  scopeId,
  onThreadIdChange,
  ...options
}: UseChatRuntimeOptions<UI_MESSAGE> = {}): AssistantRuntime => {
  const hostDestroySignal = useHostDestroySignal();
  const cloudAdapter = useCloudThreadListAdapter({
    cloud,
    scopeId,
    sdk: AI_SDK_SDK,
  });
  const fallback = useMemo(() => new AssistantChatTransport<UI_MESSAGE>(), []);
  const transport = useDynamicChatTransport(options.transport ?? fallback);
  return useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useChatThreadRuntime({ ...options, transport }, hostDestroySignal);
    },
    adapter: cloudAdapter,
    allowNesting: true,
    onThreadIdChange,
  });
};

"use client";

import type { UIMessage } from "@ai-sdk/react";
import type { AssistantCloud } from "assistant-cloud";
import type { AssistantRuntime } from "@assistant-ui/core";
import {
  useCloudThreadListAdapter,
  useRemoteThreadListRuntime,
} from "@assistant-ui/core/react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { useHostDestroySignal } from "@assistant-ui/store/internal";
import { useChatThread, type ChatThreadOptions } from "./useChatThread";
import { AI_SDK_SDK } from "./sdkIdentity";

export type UseChatRuntimeOptions<UI_MESSAGE extends UIMessage = UIMessage> =
  ChatThreadOptions<UI_MESSAGE> & {
    cloud?: AssistantCloud | undefined;
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
  onThreadIdChange,
  ...options
}: UseChatRuntimeOptions<UI_MESSAGE> = {}): AssistantRuntime => {
  const hostDestroySignal = useHostDestroySignal();
  const cloudAdapter = useCloudThreadListAdapter({ cloud, sdk: AI_SDK_SDK });
  return useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useChatThreadRuntime(options, hostDestroySignal);
    },
    adapter: cloudAdapter,
    allowNesting: true,
    onThreadIdChange,
  });
};

"use client";

import type { UIMessage } from "@ai-sdk/react";
import type { AssistantCloud } from "assistant-cloud";
import type { AssistantRuntime } from "@assistant-ui/core";
import {
  useCloudThreadListAdapter,
  useRemoteThreadListRuntime,
} from "@assistant-ui/core/react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { useChatThread, type ChatThreadOptions } from "./useChatThread";

export type UseChatRuntimeOptions<UI_MESSAGE extends UIMessage = UIMessage> =
  ChatThreadOptions<UI_MESSAGE> & {
    cloud?: AssistantCloud | undefined;
    onThreadIdChange?: ((threadId: string | undefined) => void) | undefined;
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
  return useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useChatThreadRuntime(options);
    },
    adapter: cloudAdapter,
    allowNesting: true,
    onThreadIdChange,
  });
};

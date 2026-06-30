"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import type { AssistantCloud } from "assistant-cloud";
import {
  pickExternalStoreSharedOptions,
  type AssistantRuntime,
  type ExternalStoreSharedOptions,
} from "@assistant-ui/core";
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
  ChatInit<UI_MESSAGE> &
    ExternalStoreSharedOptions & {
      cloud?: AssistantCloud | undefined;
      adapters?: AISDKRuntimeAdapter["adapters"] | undefined;
      toCreateMessage?: CustomToCreateMessageFunction;
      onResume?: AISDKRuntimeAdapter["onResume"];
      /**
       * Called when `useChatRuntime` automatically attempts to resume a pending
       * resumable stream on mount and that reconnect fails. Use this to surface
       * a toast, report telemetry, or mark the thread as needing a retry. The
       * stored stream id is still cleared after the callback runs.
       */
      onResumeError?: ((error: unknown) => void) | undefined;
      joinStrategy?: AISDKRuntimeAdapter["joinStrategy"];
      onThreadIdChange?: ((threadId: string | undefined) => void) | undefined;
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
    isDisabled: _isDisabled,
    isSendDisabled: _isSendDisabled,
    unstable_capabilities: _unstable_capabilities,
    suggestions: _suggestions,
    onResume,
    onResumeError,
    joinStrategy,
    ...chatOptions
  } = options ?? {};
  // peel guard: any shared key left in `chatOptions` collapses this to `never`
  true satisfies keyof typeof chatOptions &
    keyof ExternalStoreSharedOptions extends never
    ? true
    : never;

  const transport = useDynamicChatTransport(
    transportOptions ?? new AssistantChatTransport(),
  );

  const id = useAuiState((s) => s.threadListItem.id);
  const aui = useAui();
  const chat = useChat({
    ...chatOptions,
    id,
    transport,
  });

  const runtime = useAISDKRuntime(chat, {
    adapters,
    ...pickExternalStoreSharedOptions(options ?? {}),
    ...(toCreateMessage && { toCreateMessage }),
    ...(onResume && { onResume }),
    ...(joinStrategy && { joinStrategy }),
  });

  if (transport instanceof AssistantChatTransport) {
    transport.setRuntime(runtime);
    transport.__internal_setGetThreadListItem(() =>
      aui.threadListItem.source ? aui.threadListItem() : undefined,
    );
  }

  const resumeFiredRef = useRef(false);
  const onResumeErrorRef = useRef(onResumeError);
  useEffect(() => {
    onResumeErrorRef.current = onResumeError;
  });
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
      try {
        onResumeErrorRef.current?.(err);
      } catch (callbackError) {
        console.error(
          "[assistant-ui] resumable: onResumeError callback failed",
          callbackError,
        );
      } finally {
        adapter.storage.clear();
      }
    });
  }, [transport, chat]);

  return runtime;
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

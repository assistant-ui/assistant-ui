import { useEffect, useMemo, useRef } from "react";
import type { UIMessage } from "@ai-sdk/react";
import type { ChatTransport } from "ai";
import { DefaultChatTransport } from "ai";
import type { AssistantCloud } from "assistant-cloud";
import type { UseThreadsResult } from "../types";
import type { CloudChatConfig } from "../core/CloudChatCore";
import { CloudChatCore } from "../core/CloudChatCore";

export function useCloudChatCore(
  cloud: AssistantCloud,
  options: {
    threads: UseThreadsResult;
    chatConfig: CloudChatConfig;
    onSyncError?: ((error: Error) => void) | undefined;
    transport?: ChatTransport<UIMessage> | undefined;
  },
): CloudChatCore {
  const { threads, chatConfig, onSyncError, transport } = options;
  const currentOptions = { threads, chatConfig, onSyncError };

  const fallbackTransport = useRef<ChatTransport<UIMessage>>(
    new DefaultChatTransport({}),
  );
  const currentTransport = transport ?? fallbackTransport.current;
  const initialStateRef = useRef({
    options: currentOptions,
    transport: currentTransport,
  });
  initialStateRef.current = {
    options: currentOptions,
    transport: currentTransport,
  };

  const core = useMemo(() => {
    const initialState = initialStateRef.current;
    const nextCore = new CloudChatCore(cloud, initialState.options);
    nextCore.updateOptions(initialState.options, initialState.transport);
    return nextCore;
  }, [cloud]);

  core.setChatCreationConfig(chatConfig);
  useEffect(() => {
    core.updateOptions(currentOptions, currentTransport);
  });

  // Track component lifetime for safe async operations
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  core.mountedRef = mountedRef;

  return core;
}

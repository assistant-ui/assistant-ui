import { useEffect, useRef } from "react";
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

  // Recreate when cloud identity changes (prevents stale persistence client)
  const coreRef = useRef<CloudChatCore | null>(null);
  if (!coreRef.current || coreRef.current.cloud !== cloud) {
    coreRef.current = new CloudChatCore(cloud, {
      threads,
      chatConfig,
      onSyncError,
    });
  }
  const core = coreRef.current;

  core.options = { threads, chatConfig, onSyncError };

  // Track component lifetime for safe async operations
  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );
  core.mountedRef = mountedRef;

  const fallbackTransport = useRef<ChatTransport<UIMessage>>(
    new DefaultChatTransport({}),
  );
  core.baseTransport = transport ?? fallbackTransport.current;

  return core;
}

import { useEffect, useInsertionEffect, useMemo, useRef } from "react";
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
  const latestStateRef = useRef({
    options: currentOptions,
    transport: currentTransport,
  });
  latestStateRef.current = {
    options: currentOptions,
    transport: currentTransport,
  };

  const core = useMemo(() => {
    const latestState = latestStateRef.current;
    return new CloudChatCore(cloud, latestState.options, latestState.transport);
  }, [cloud]);

  // Track component lifetime for safe async operations
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // The only hook that runs before descendant layout effects: a parent's
  // useLayoutEffect fires after its children's, and useEffect leaves a
  // pre-passive window in which the core still answers with the previous
  // options and transport.
  useInsertionEffect(() => {
    core.mountedRef = mountedRef;
    core.updateOptions(currentOptions, currentTransport);
  });

  return core;
}

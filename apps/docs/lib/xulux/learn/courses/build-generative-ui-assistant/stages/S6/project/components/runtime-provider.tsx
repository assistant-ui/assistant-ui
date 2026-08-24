"use client";

import {
  AssistantRuntimeProvider,
  unstable_Interactables,
  useAui,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import { useMemo } from "react";
import { createBrowserThreadListAdapter } from "../lib/browser-thread-list-adapter";

export function RuntimeProvider({
  api = "/api/chat",
  storagePrefix = "generative-ui-course:",
  children,
}: Readonly<{
  api?: string;
  storagePrefix?: string;
  children: React.ReactNode;
}>) {
  const adapter = useMemo(
    () => createBrowserThreadListAdapter(storagePrefix),
    [storagePrefix],
  );
  const transport = useMemo(() => new AssistantChatTransport({ api }), [api]);
  const runtime = useRemoteThreadListRuntime({
    adapter,
    runtimeHook: function useCourseChatRuntime() {
      return useChatRuntime({ transport });
    },
  });
  const aui = useAui({ unstable_interactables: unstable_Interactables() });

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

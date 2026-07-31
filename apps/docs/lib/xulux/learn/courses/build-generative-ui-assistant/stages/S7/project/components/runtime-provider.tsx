"use client";

import {
  AssistantRuntimeProvider,
  unstable_Interactables,
  useAui,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";
import { useMemo } from "react";
import { createBrowserThreadListAdapter } from "../lib/browser-thread-list-adapter";

export function RuntimeProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const adapter = useMemo(
    () => createBrowserThreadListAdapter("generative-ui-course:"),
    [],
  );
  const transport = useMemo(
    () => new AssistantChatTransport({ api: "/api/chat" }),
    [],
  );
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

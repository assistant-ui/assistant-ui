"use client";

import {
  AssistantRuntimeProvider,
  unstable_Interactables,
  useAui,
} from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";

export function RuntimeProvider({
  api = "/api/chat",
  children,
}: Readonly<{ api?: string; children: React.ReactNode }>) {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api }),
  });
  const aui = useAui({ unstable_interactables: unstable_Interactables() });

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

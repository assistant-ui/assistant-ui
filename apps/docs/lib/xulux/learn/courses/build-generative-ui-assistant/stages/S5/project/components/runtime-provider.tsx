"use client";

import {
  AssistantRuntimeProvider,
  AuiConfig,
  unstable_Interactables,
  useAui,
} from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";

export function RuntimeProvider({
  api = "/api/chat",
  children,
}: Readonly<{ api?: string; children: React.ReactNode }>) {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api }),
  });
  const aui = useAui();
  const config = AuiConfig({
    unstable_interactables: unstable_Interactables(),
  });

  return (
    <AssistantRuntimeProvider aui={aui} config={config} runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

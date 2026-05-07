"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const runtime = useChatRuntime();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

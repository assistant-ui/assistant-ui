"use client";

import { AssistantCloud, AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";

const baseUrl = process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL;

const cloud = baseUrl
  ? new AssistantCloud({
      baseUrl,
      anonymous: true,
    })
  : undefined;

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const runtime = useChatRuntime({
    cloud,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

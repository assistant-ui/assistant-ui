"use client";

import { AssistantCloud, AssistantRuntimeProvider } from "@assistant-ui/react";
// import { useEdgeRuntime } from "@assistant-ui/react-edge";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
// CG TODO: cleanup this import
import { createToolbox } from "@assistant-ui/react/model-context/tool";
import type { BackendTools } from "./api/chat/route";

const cloud = new AssistantCloud({
  baseUrl: process.env["NEXT_PUBLIC_ASSISTANT_BASE_URL"]!,
  anonymous: true,
});

const toolbox = createToolbox<BackendTools>();

console.log(toolbox);

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const runtime = useChatRuntime({
    cloud,
    api: "/api/chat",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

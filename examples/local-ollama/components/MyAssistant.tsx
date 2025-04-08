"use client";

import { AssistantRuntimeProvider, useEdgeRuntime } from "@assistant-ui/react";
import { Thread } from "./assistant-ui/thread";

export function MyAssistant() {
  const runtime = useEdgeRuntime({ api: "/api/chat" });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}

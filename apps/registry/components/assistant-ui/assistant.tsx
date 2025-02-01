"use client";

import { AssistantRuntimeProvider, useEdgeRuntime } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";

export const Assistant = () => {
  const runtime = useEdgeRuntime({
    api: "/api/chat",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
};

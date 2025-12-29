"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  useLocalThreadPersistence,
} from "@assistant-ui/react";
import { localAdapter } from "@/lib/localAdapter";

export default function Home() {
  const runtime = useLocalRuntime(localAdapter);

  useLocalThreadPersistence(runtime, {
    key: "assistant-ui:with-local-persistence",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="h-full">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}

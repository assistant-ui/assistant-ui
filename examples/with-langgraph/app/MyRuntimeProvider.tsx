"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useLangGraphRuntime } from "@assistant-ui/react-langgraph";
import {
  createThread,
  getThreadState,
  getCheckpointId,
  sendMessage,
} from "@/lib/chatApi";
import { LangChainMessage } from "@assistant-ui/react-langgraph";

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const runtime = useLangGraphRuntime({
    stream: async function* (messages, { initialize, ...config }) {
      const { externalId } = await initialize();
      if (!externalId) throw new Error("Thread not found");

      const generator = sendMessage({
        threadId: externalId,
        messages,
        config,
      });

      yield* generator;
    },
    create: async () => {
      const { thread_id } = await createThread();
      return { externalId: thread_id };
    },
    load: async (externalId) => {
      const state = await getThreadState(externalId);
      return {
        messages:
          (state.values as { messages?: LangChainMessage[] }).messages ?? [],
        interrupts: state.tasks[0]?.interrupts ?? [],
      };
    },
    getCheckpointId,
    eventHandlers: {
      onMessageChunk: (chunk, metadata) => {
        console.log("[messages-tuple] chunk:", chunk);
        console.log("[messages-tuple] metadata:", metadata);
      },
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

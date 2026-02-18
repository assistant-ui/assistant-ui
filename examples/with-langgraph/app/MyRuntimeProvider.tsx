"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useLangGraphRuntime } from "@assistant-ui/react-langgraph";
import { createThread, sendMessage } from "@/lib/chatApi";
import { useRef } from "react";

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const threadIdRef = useRef<string | undefined>(undefined);
  const runtime = useLangGraphRuntime({
    stream: async function* (messages) {
      if (!threadIdRef.current) {
        const { thread_id } = await createThread();
        threadIdRef.current = thread_id;
      }

      const generator = sendMessage({
        threadId: threadIdRef.current,
        messages,
      });

      yield* generator;
    },
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

"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useLangChainLangGraphRuntime,
  LangChainMessage,
} from "@assistant-ui/react-langgraph";
import { useRef } from "react";
import { createThread, sendMessage } from "@/lib/chatApi";

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const threadIdRef = useRef<string | undefined>();
  const runtime = useLangChainLangGraphRuntime({
    threadId: threadIdRef.current,
    stream: async (message) => {
      if (!threadIdRef.current) {
        const { thread_id } = await createThread();
        threadIdRef.current = thread_id;
      }
      const threadId = threadIdRef.current;
      return sendMessage({
        threadId,
        assistantId: process.env["NEXT_PUBLIC_LANGGRAPH_GRAPH_ID"] as string,
        message,
        model: "openai",
        userId: "",
        systemInstructions: "",
      });
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

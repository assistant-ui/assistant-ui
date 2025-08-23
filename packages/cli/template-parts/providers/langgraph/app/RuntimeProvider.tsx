"use client";

import { useRef } from "react";
import { useLangGraphRuntime } from "@assistant-ui/react-langgraph";
import { createThread, getThreadState, sendMessage } from "@/lib/chatApi";

export function useRuntime() {
  const threadIdRef = useRef<string | undefined>(undefined);
  
  return useLangGraphRuntime({
    threadId: threadIdRef.current,
    stream: async (messages, { command }) => {
      if (!threadIdRef.current) {
        const { thread_id } = await createThread();
        threadIdRef.current = thread_id;
      }
      const threadId = threadIdRef.current;
      return sendMessage({
        threadId,
        messages,
        command,
      });
    },
    onSwitchToNewThread: async () => {
      const { thread_id } = await createThread();
      threadIdRef.current = thread_id;
    },
    onSwitchToThread: async (threadId) => {
      const state = await getThreadState(threadId);
      threadIdRef.current = threadId;
      return { messages: state.values.messages };
    },
  });
}
"use client";

import {
  AssistantCloud,
  AssistantRuntimeProvider,
  useCloudGetOrCreateThread,
  useCloudThreadListRuntime,
} from "@assistant-ui/react";
import { useLangGraphRuntime } from "@assistant-ui/react-langgraph";
import { createThread, getThreadState, sendMessage } from "@/lib/chatApi";
import { LangChainMessage } from "@assistant-ui/react-langgraph";

const useMyLangGraphRuntime = () => {
  const getOrCreateThread = useCloudGetOrCreateThread();
  const runtime = useLangGraphRuntime({
    stream: async (messages) => {
      const { externalId } = await getOrCreateThread();
      if (!externalId) throw new Error("Thread not found");

      return sendMessage({
        threadId: externalId,
        messages,
      });
    },
    onSwitchToThread: async (threadId) => {
      const state = await getThreadState(threadId);
      return {
        messages:
          (state.values as { messages?: LangChainMessage[] }).messages ?? [],
      };
    },
  });

  return runtime;
};

const cloud = new AssistantCloud({
  baseUrl: "https://api.assistant-ui.com",
  unstable_projectId: process.env["NEXT_PUBLIC_ASSISTANT_PROJECT_ID"]!,
  authToken: () =>
    fetch("/api/assistant-ui-token", { method: "POST" })
      .then((r) => r.json())
      .then((r) => r.token),
});

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const runtime = useCloudThreadListRuntime({
    cloud,
    runtimeHook: useMyLangGraphRuntime,
    create: async () => {
      const { thread_id } = await createThread();
      return { externalId: thread_id };
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

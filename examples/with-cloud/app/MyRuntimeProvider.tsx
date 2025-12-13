"use client";

import {
  AssistantRuntimeProvider,
  useAssistantTransportRuntime,
  AssistantCloud,
  ThreadMessage,
  AssistantTransportConnectionMetadata,
} from "@assistant-ui/react";
import { useMemo, useCallback } from "react";

type State = {
  messages: ThreadMessage[];
  thread_id?: string | undefined;
  assistant_id?: string | undefined;
};

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Initialize cloud with custom baseUrl
  const cloud = useMemo(() => {
    return new AssistantCloud({
      baseUrl:
        process.env["NEXT_PUBLIC_ASSISTANT_BASE_URL"] ||
        "http://localhost:8788",
      apiKey: process.env["NEXT_PUBLIC_ASSISTANT_API_KEY"] || "dummy-key",
      userId: process.env["NEXT_PUBLIC_ASSISTANT_USER_ID"] || "user_default",
      workspaceId:
        process.env["NEXT_PUBLIC_ASSISTANT_WORKSPACE_ID"] || "org_default",
    });
  }, []);

  const assistantId = process.env["NEXT_PUBLIC_ASSISTANT_ID"] || "asst_123";

  // Get transport options from cloud
  const transportOpts = useMemo(() => {
    return cloud.streams.__internal_getAssistantOptions();
  }, [cloud]);

  // Stable converter function using useCallback
  const converter = useCallback(
    (state: State, meta: AssistantTransportConnectionMetadata) => {
      return {
        messages: state.messages || [],
        isRunning: meta.isSending,
      };
    },
    [],
  );

  const runtime = useAssistantTransportRuntime({
    api: transportOpts.api,
    resumeApi: transportOpts.resumeApi,
    protocol: "assistant-transport",
    initialState: {
      messages: [],
      thread_id: undefined,
      assistant_id: assistantId,
    },
    converter,
    headers: transportOpts.headers,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

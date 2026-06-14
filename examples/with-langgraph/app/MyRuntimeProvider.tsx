"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useStreamRuntime } from "@assistant-ui/react-langchain";
import { Client } from "@langchain/langgraph-sdk";

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apiUrl =
    process.env.NEXT_PUBLIC_LANGGRAPH_API_URL ||
    (typeof window !== "undefined"
      ? new URL("/api", window.location.href).href
      : undefined);

  const runtime = useStreamRuntime({
    assistantId: process.env.NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID!,
    apiUrl,
    create: async () => {
      const { thread_id } = await new Client({ apiUrl }).threads.create();
      return { externalId: thread_id };
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

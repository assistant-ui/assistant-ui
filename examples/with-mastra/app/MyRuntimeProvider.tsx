"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useMastraRuntime } from "@assistant-ui/react-mastra";
import { MastraClient } from "@mastra/client-js";
import { type PropsWithChildren, useCallback, useState } from "react";

export const mastraUrl =
  process.env.NEXT_PUBLIC_MASTRA_URL ?? "http://localhost:4111";

export const mastraClient = new MastraClient({ baseUrl: mastraUrl });

const transportOptions = { api: `${mastraUrl}/chat` };
const threadStorageKey = "assistant-ui-mastra-thread-id";

export function MyRuntimeProvider({ children }: PropsWithChildren) {
  const [threadId, setThreadId] = useState<string | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    return window.localStorage.getItem(threadStorageKey) ?? undefined;
  });
  const handleThreadIdChange = useCallback(
    (nextThreadId: string | undefined) => {
      setThreadId(nextThreadId);
      if (nextThreadId) {
        window.localStorage.setItem(threadStorageKey, nextThreadId);
      } else {
        window.localStorage.removeItem(threadStorageKey);
      }
    },
    [],
  );

  const runtime = useMastraRuntime({
    client: mastraClient,
    agentId: "releaseAssistant",
    resourceId: "assistant-ui-mastra-example",
    threadId,
    onThreadIdChange: handleThreadIdChange,
    transportOptions,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

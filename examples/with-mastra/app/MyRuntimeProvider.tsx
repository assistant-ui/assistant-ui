"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useMastraRuntime } from "@assistant-ui/react-mastra";
import { MastraClient } from "@mastra/client-js";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export const mastraUrl =
  process.env.NEXT_PUBLIC_MASTRA_URL ?? "http://localhost:4111";

export const mastraClient = new MastraClient({ baseUrl: mastraUrl });

const transportOptions = { api: `${mastraUrl}/chat` };
const threadStorageKey = "assistant-ui-mastra-thread-id";
const resourceStorageKey = "assistant-ui-mastra-resource-id";
const ResourceIdContext = createContext<string | null>(null);

export const useMastraResourceId = () => {
  const resourceId = useContext(ResourceIdContext);
  if (!resourceId) {
    throw new Error(
      "useMastraResourceId must be used within MyRuntimeProvider.",
    );
  }
  return resourceId;
};

function MastraRuntimeProvider({
  children,
  resourceId,
}: PropsWithChildren<{ resourceId: string }>) {
  const [threadId, setThreadId] = useState<string | undefined>(() => {
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
    resourceId,
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

export function MyRuntimeProvider({ children }: PropsWithChildren) {
  const [resourceId, setResourceId] = useState<string>();
  useEffect(() => {
    const stored = window.localStorage.getItem(resourceStorageKey);
    const nextResourceId = stored ?? window.crypto.randomUUID();
    window.localStorage.setItem(resourceStorageKey, nextResourceId);
    setResourceId(nextResourceId);
  }, []);

  if (!resourceId) return null;

  return (
    <ResourceIdContext.Provider value={resourceId}>
      <MastraRuntimeProvider resourceId={resourceId}>
        {children}
      </MastraRuntimeProvider>
    </ResourceIdContext.Provider>
  );
}

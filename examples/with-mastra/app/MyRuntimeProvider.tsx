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
  useMemo,
  useState,
} from "react";

export const mastraUrl =
  process.env.NEXT_PUBLIC_MASTRA_URL ?? "http://localhost:4111";

export const mastraClient = new MastraClient({ baseUrl: mastraUrl });

export const mastraExampleAgentIds = [
  "releaseAssistant",
  "riskAnalyst",
] as const;
export type MastraExampleAgentId = (typeof mastraExampleAgentIds)[number];

const threadStorageKey = (agentId: MastraExampleAgentId) =>
  `assistant-ui-mastra-thread-id:${agentId}`;
const resourceStorageKey = "assistant-ui-mastra-resource-id";
const ResourceIdContext = createContext<string | null>(null);

const readThreadIds = () => {
  if (typeof window === "undefined") return {};
  return Object.fromEntries(
    mastraExampleAgentIds.flatMap((agentId) => {
      const threadId = window.localStorage.getItem(threadStorageKey(agentId));
      return threadId ? [[agentId, threadId]] : [];
    }),
  ) as Partial<Record<MastraExampleAgentId, string>>;
};

export const useMastraResourceId = () => {
  const resourceId = useContext(ResourceIdContext);
  if (!resourceId) {
    throw new Error(
      "useMastraResourceId must be used within MyRuntimeProvider.",
    );
  }
  return resourceId;
};

function AgentRuntimeProvider({
  agentId,
  children,
  resourceId,
}: PropsWithChildren<{
  agentId: MastraExampleAgentId;
  resourceId: string;
}>) {
  const [threadIds, setThreadIds] =
    useState<Partial<Record<MastraExampleAgentId, string>>>(readThreadIds);
  const threadId = threadIds[agentId];
  const handleThreadIdChange = useCallback(
    (nextThreadId: string | undefined) => {
      setThreadIds((current) => ({ ...current, [agentId]: nextThreadId }));
      if (nextThreadId) {
        window.localStorage.setItem(threadStorageKey(agentId), nextThreadId);
      } else {
        window.localStorage.removeItem(threadStorageKey(agentId));
      }
    },
    [agentId],
  );
  const transportOptions = useMemo(
    () => ({ api: `${mastraUrl}/chat/${agentId}` }),
    [agentId],
  );

  const runtime = useMastraRuntime({
    client: mastraClient,
    agentId,
    resourceId: `${resourceId}:${agentId}`,
    threadId,
    onThreadIdChange: handleThreadIdChange,
    transportOptions,
  });

  return (
    <AssistantRuntimeProvider key={agentId} runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

export function MyRuntimeProvider({
  agentId,
  children,
}: PropsWithChildren<{ agentId: MastraExampleAgentId }>) {
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
      <AgentRuntimeProvider agentId={agentId} resourceId={resourceId}>
        {children}
      </AgentRuntimeProvider>
    </ResourceIdContext.Provider>
  );
}

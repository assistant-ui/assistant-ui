"use client";

import { useState, type ReactNode } from "react";
import {
  AssistantCloud,
  AssistantRuntimeProvider,
  useAuiState,
  useCloudThreadListRuntime,
} from "@assistant-ui/react";
import { useAgUiRuntime } from "@assistant-ui/react-ag-ui";
import { DurableHttpAgent } from "@/lib/durable-agent";

const baseUrl =
  process.env["NEXT_PUBLIC_DURABLE_AGENT_URL"] ?? "http://localhost:8000";

const cloud = new AssistantCloud({
  baseUrl: process.env["NEXT_PUBLIC_ASSISTANT_BASE_URL"]!,
  anonymous: true,
});

// One runtime per cloud thread. The durable server keys threads by the cloud
// thread's external id, which `create` sets to the thread's first id.
function useDurableThreadRuntime() {
  const threadId = useAuiState(
    (s) => s.threadListItem.externalId ?? s.threadListItem.id,
  );
  const [agent] = useState(() => new DurableHttpAgent({ baseUrl, threadId }));
  return useAgUiRuntime({
    agent,
    durableRuns: { getThread: (id) => agent.getThread(id) },
  });
}

/** Assistant Cloud keeps the thread list and the messages; the durable server keeps runs going. */
export function CloudRuntimeProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const runtime = useCloudThreadListRuntime({
    cloud,
    runtimeHook: useDurableThreadRuntime,
    create: async (threadId) => ({ externalId: threadId }),
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

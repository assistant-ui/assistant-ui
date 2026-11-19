"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AssistantCloud,
  AssistantRuntimeProvider,
  useAuiState,
  useCloudThreadListRuntime,
  useRuntimeAdapters,
} from "@assistant-ui/react";
import { useAgUiRuntime } from "@assistant-ui/react-ag-ui";
import { DurableHttpAgent } from "@/lib/durable-agent";
import { useDurableTakeover, withDurableRuns } from "@/lib/cloud-durable";

const baseUrl =
  process.env["NEXT_PUBLIC_DURABLE_AGENT_URL"] ?? "http://localhost:8000";

// Anonymous access keeps the example self-contained. In production, sign
// users in to Assistant Cloud, send the same identity to the durable server
// in the agent's headers, and scope its threads with DurableAGUI's `owner`.
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
  useEffect(() => {
    agent.threadId = threadId;
  }, [agent, threadId]);
  const cloudHistory = useRuntimeAdapters()?.history;
  const history = useMemo(
    () => cloudHistory && withDurableRuns(cloudHistory, agent),
    [cloudHistory, agent],
  );
  const runtime = useAgUiRuntime({
    agent,
    ...(history ? { adapters: { history } } : undefined),
  });
  useDurableTakeover(runtime, history);
  return runtime;
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

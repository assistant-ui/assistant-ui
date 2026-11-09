"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAgUiRuntime } from "@assistant-ui/react-ag-ui";
import {
  DurableHttpAgent,
  durableThreadHistory,
  toThreadMessages,
  type DurableThreadSummary,
} from "@/lib/durable-agent";

const baseUrl =
  process.env["NEXT_PUBLIC_DURABLE_AGENT_URL"] ?? "http://localhost:8000";

const initialThreadId = () => {
  const fromUrl = new URLSearchParams(window.location.search).get("thread");
  return fromUrl ?? crypto.randomUUID();
};

const showThread = (threadId: string) => {
  const url = new URL(window.location.href);
  url.searchParams.set("thread", threadId);
  window.history.replaceState(null, "", url);
};

export function MyRuntimeProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  // One agent for the whole session: switching threads changes its threadId,
  // so the runtime rejoins the new thread's run through the same agent.
  const [agent] = useState(() => {
    const threadId = initialThreadId();
    showThread(threadId);
    return new DurableHttpAgent({ baseUrl, threadId });
  });
  const [threadId, setThreadId] = useState(agent.threadId);
  const [threads, setThreads] = useState<DurableThreadSummary[]>([]);
  const history = useMemo(() => durableThreadHistory(agent), [agent]);

  const refreshThreads = useCallback(() => {
    agent.listThreads().then(setThreads, () => {});
  }, [agent]);
  useEffect(refreshThreads, [refreshThreads]);

  const select = useCallback(
    (id: string) => {
      agent.threadId = id;
      showThread(id);
      setThreadId(id);
    },
    [agent],
  );

  const threadList = useMemo(
    () => ({
      threadId,
      threads: threads.map(({ id, title }) => ({
        status: "regular" as const,
        id,
        title,
      })),
      onSwitchToNewThread: () => select(crypto.randomUUID()),
      onSwitchToThread: async (id: string) => {
        select(id);
        const thread = await agent.getThread(id);
        return {
          messages: toThreadMessages(thread),
          unstable_resume: thread?.running ?? false,
        };
      },
    }),
    [agent, select, threadId, threads],
  );

  const runtime = useAgUiRuntime({
    agent,
    adapters: { history, threadList },
  });

  useEffect(() => {
    let wasRunning = runtime.thread.getState().isRunning;
    return runtime.thread.subscribe(() => {
      const { isRunning } = runtime.thread.getState();
      if (isRunning !== wasRunning) refreshThreads();
      wasRunning = isRunning;
    });
  }, [runtime, refreshThreads]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

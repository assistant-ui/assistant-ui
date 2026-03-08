"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  type ThreadMessage,
} from "@assistant-ui/react";
import { HttpAgent } from "@ag-ui/client";
import { useAgUiRuntime } from "@assistant-ui/react-ag-ui";

type StoredThread = {
  id: string;
  messages: readonly ThreadMessage[];
};

/**
 * AG-UI runtime with threadList adapter for multi-thread support.
 */
export function MyRuntimeProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const agentUrl =
    (process.env["NEXT_PUBLIC_AGUI_AGENT_URL"] as string | undefined) ??
    "http://localhost:8000/agent";

  // Simple in-memory thread storage
  const threadsRef = useRef<Map<string, StoredThread>>(new Map());
  const [currentThreadId, setCurrentThreadId] = useState<string>(() => {
    const id = crypto.randomUUID();
    threadsRef.current.set(id, { id, messages: [] });
    return id;
  });

  const agent = useMemo(() => {
    return new HttpAgent({
      url: agentUrl,
      threadId: currentThreadId,
      headers: {
        Accept: "text/event-stream",
      },
    });
  }, [agentUrl, currentThreadId]);

  const threadListAdapter = useMemo(
    () => ({
      threadId: currentThreadId,
      onSwitchToNewThread: async () => {
        const newId = crypto.randomUUID();
        threadsRef.current.set(newId, { id: newId, messages: [] });
        setCurrentThreadId(newId);
        console.debug("[agui] Switched to new thread:", newId);
      },
      onSwitchToThread: async (threadId: string) => {
        const thread = threadsRef.current.get(threadId);
        if (!thread) {
          throw new Error(`Thread ${threadId} not found`);
        }
        setCurrentThreadId(threadId);
        console.debug("[agui] Switched to thread:", threadId);
        return { messages: thread.messages };
      },
    }),
    [currentThreadId],
  );

  const runtime = useAgUiRuntime({
    agent,
    logger: {
      debug: (...a: any[]) => console.debug("[agui]", ...a),
      error: (...a: any[]) => console.error("[agui]", ...a),
    },
    adapters: {
      threadList: threadListAdapter,
    },
  });

  // Persist messages to threadsRef when they change
  useEffect(() => {
    return runtime.thread.subscribe(() => {
      threadsRef.current.set(currentThreadId, {
        id: currentThreadId,
        messages: runtime.thread.getState().messages,
      });
    });
  }, [runtime, currentThreadId]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

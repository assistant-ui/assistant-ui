"use client";

import {
  AssistantRuntimeProvider,
  useCloudThreadListRuntime,
} from "@assistant-ui/react";
import { useMastraRuntime } from "@assistant-ui/react-mastra";
import { useState, useCallback } from "react";

const useMyMastraRuntime = () => {
  const [selectedAgent, setSelectedAgent] = useState("chefAgent");

  const runtime = useMastraRuntime({
    agentId: selectedAgent,
    memory: true,
    stream: async function* (messages) {
      // Call the chat API with the selected agent
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages,
          agentId: selectedAgent,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from Mastra agent");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("0:")) {
              const data = line.slice(2);
              try {
                const parsed = JSON.parse(data);
                yield parsed;
              } catch (e) {
                // Skip invalid JSON
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
    onSwitchToThread: async (threadId) => {
      // Retrieve thread state from Mastra memory
      // This is a simplified implementation
      try {
        const response = await fetch(`/api/chat/thread/${threadId}`);
        if (response.ok) {
          const threadState = await response.json();
          return {
            messages: threadState.messages || [],
            interrupts: threadState.interrupts || [],
          };
        }
      } catch (error) {
        console.error("Failed to load thread state:", error);
      }

      // Fallback: return empty state
      return {
        messages: [],
        interrupts: [],
      };
    },
    eventHandlers: {
      onMetadata: (metadata) => {
        console.log("Mastra metadata:", metadata);
      },
      onError: (error) => {
        console.error("Mastra error:", error);
      },
      onInterrupt: (interrupt) => {
        console.log("Mastra interrupt:", interrupt);
      },
    },
  });

  return { runtime, selectedAgent, setSelectedAgent };
};

export function MyRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const threadListRuntime = useCloudThreadListRuntime({
    cloud: null, // Using local memory instead of cloud
    runtimeHook: useMyMastraRuntime,
    create: async () => {
      // Create a new thread ID
      return { externalId: `thread_${Date.now()}` };
    },
  });

  return (
    <AssistantRuntimeProvider runtime={threadListRuntime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
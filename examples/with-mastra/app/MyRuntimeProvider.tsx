"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useMastraRuntime } from "@assistant-ui/react-mastra";
import { createContext, useContext, useState } from "react";

interface AgentContextType {
  selectedAgent: string;
  setSelectedAgent: (agent: string) => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const useAgentContext = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgentContext must be used within MyRuntimeProvider");
  }
  return context;
};

export function MyRuntimeProvider({ children }: { children: React.ReactNode }) {
  const [selectedAgent, setSelectedAgent] = useState("chefAgent");

  const runtime = useMastraRuntime({
    api: "/api/chat",
    agentId: selectedAgent,
    memory: {
      storage: "libsql",
      userId: "default-user",
    },
    onError: (error) => {
      console.error("Mastra error:", error);
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
      onToolCall: (toolCall) => {
        console.log("Tool call:", toolCall);
      },
      onToolResult: (toolResult) => {
        console.log("Tool result:", toolResult);
      },
    },
  });

  return (
    <AgentContext.Provider value={{ selectedAgent, setSelectedAgent }}>
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    </AgentContext.Provider>
  );
}

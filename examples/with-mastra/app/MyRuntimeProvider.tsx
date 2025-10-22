"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useMastraRuntime } from "@assistant-ui/react-mastra";
import { createContext, useContext, useState, useCallback } from "react";

interface AgentContextType {
  selectedAgent: string;
  setSelectedAgent: (agent: string) => void;
}

interface WorkflowContextType {
  workflowState: any;
  startWorkflow: (candidateData: any) => Promise<void>;
  resumeWorkflow: (resumeData: any) => Promise<void>;
  isStarting: boolean;
  isResuming: boolean;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);
const WorkflowContext = createContext<WorkflowContextType | undefined>(
  undefined,
);

export const useAgentContext = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgentContext must be used within MyRuntimeProvider");
  }
  return context;
};

export const useWorkflowContext = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("useWorkflowContext must be used within MyRuntimeProvider");
  }
  return context;
};

export function MyRuntimeProvider({ children }: { children: React.ReactNode }) {
  const [selectedAgent, setSelectedAgent] = useState("screeningAgent");
  const [workflowState, setWorkflowState] = useState<any>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

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
      onError: (error) => {
        console.error("Mastra error:", error);
      },
    },
  });

  const startWorkflow = useCallback(async (candidateData: any) => {
    setIsStarting(true);
    try {
      const response = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(candidateData),
      });

      if (!response.ok) {
        throw new Error("Failed to start workflow");
      }

      const data = await response.json();

      const currentStep = data.suspended?.[0]?.[0] || "screening-step";
      setWorkflowState({
        id: data.runId,
        status: data.status,
        current: currentStep,
        suspendData:
          data.result?.steps?.[currentStep]?.suspendPayload || data.result,
      });
    } catch (error) {
      console.error("Failed to start workflow:", error);
    } finally {
      setIsStarting(false);
    }
  }, []);

  const resumeWorkflow = useCallback(
    async (resumeData: any) => {
      if (!workflowState) return;

      setIsResuming(true);
      try {
        const response = await fetch("/api/workflow/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            runId: workflowState.id,
            stepId: workflowState.current,
            resumeData,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to resume workflow");
        }

        const data = await response.json();

        if (data.status === "success") {
          setWorkflowState({
            ...workflowState,
            status: "completed",
          });
        } else if (data.status === "suspended") {
          const nextStep = data.suspended?.[0]?.[0];
          setWorkflowState({
            ...workflowState,
            status: data.status,
            current: nextStep || workflowState.current,
            suspendData:
              data.result?.steps?.[nextStep]?.suspendPayload || data.result,
          });
        }
      } catch (error) {
        console.error("Failed to resume workflow:", error);
      } finally {
        setIsResuming(false);
      }
    },
    [workflowState],
  );

  return (
    <AgentContext.Provider value={{ selectedAgent, setSelectedAgent }}>
      <WorkflowContext.Provider
        value={{
          workflowState,
          startWorkflow,
          resumeWorkflow,
          isStarting,
          isResuming,
        }}
      >
        <AssistantRuntimeProvider runtime={runtime}>
          {children}
        </AssistantRuntimeProvider>
      </WorkflowContext.Provider>
    </AgentContext.Provider>
  );
}

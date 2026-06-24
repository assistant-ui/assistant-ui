"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useMastraRuntime,
  useMastraWorkflows,
  type MastraWorkflowState,
} from "@assistant-ui/react-mastra";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

interface AgentContextType {
  selectedAgent: string;
  setSelectedAgent: (agent: string) => void;
}

interface WorkflowContextType {
  workflowState: MastraWorkflowState | null;
  startWorkflow: (candidateData: Record<string, unknown>) => Promise<void>;
  resumeWorkflow: (resumeData: unknown) => Promise<void>;
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

export function MyRuntimeProvider({ children }: { children: ReactNode }) {
  const [selectedAgent, setSelectedAgent] = useState("screeningAgent");
  const [isStarting, setIsStarting] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

  const runtime = useMastraRuntime({
    api: "/api/chat",
    agentId: selectedAgent,
    memory: {
      userId: "default-user",
    },
  });

  const workflowConfig = useMemo(
    () => ({
      workflowId: "hiringWorkflow",
      apiUrl: "/api/workflow",
      initialState: "screening-step",
    }),
    [],
  );
  const workflow = useMastraWorkflows(workflowConfig);

  const startWorkflow = useCallback(
    async (candidateData: Record<string, unknown>) => {
      setIsStarting(true);
      try {
        await workflow.startWorkflow(candidateData);
      } finally {
        setIsStarting(false);
      }
    },
    [workflow],
  );

  const resumeWorkflow = useCallback(
    async (resumeData: unknown) => {
      setIsResuming(true);
      try {
        await workflow.resumeWorkflow(resumeData);
      } finally {
        setIsResuming(false);
      }
    },
    [workflow],
  );

  const agentContext = useMemo(() => {
    return { selectedAgent, setSelectedAgent };
  }, [selectedAgent]);

  const workflowContext = useMemo(() => {
    return {
      workflowState: workflow.workflowState,
      startWorkflow,
      resumeWorkflow,
      isStarting,
      isResuming,
    };
  }, [
    isResuming,
    isStarting,
    resumeWorkflow,
    startWorkflow,
    workflow.workflowState,
  ]);

  return (
    <AgentContext.Provider value={agentContext}>
      <WorkflowContext.Provider value={workflowContext}>
        <AssistantRuntimeProvider runtime={runtime}>
          {children}
        </AssistantRuntimeProvider>
      </WorkflowContext.Provider>
    </AgentContext.Provider>
  );
}

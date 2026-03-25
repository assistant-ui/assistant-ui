"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { AgentRuntime, AgentState } from "../runtime";
import { useTask } from "./useTaskState";

const AgentContext = createContext<string | null>(null);

export interface AgentProviderProps {
  agentId: string;
  children: ReactNode;
}

export function AgentProvider({ agentId, children }: AgentProviderProps) {
  return (
    <AgentContext.Provider value={agentId}>{children}</AgentContext.Provider>
  );
}

export function useAgentId(): string {
  const agentId = useContext(AgentContext);
  if (!agentId) {
    throw new Error("useAgentId must be used within an AgentProvider");
  }
  return agentId;
}

export function useAgent(): AgentRuntime {
  const task = useTask();
  const agentId = useAgentId();
  const agent = task.getAgent(agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }
  return agent;
}

export function useAgentState<T>(selector: (state: AgentState) => T): T {
  const agent = useAgent();

  return useSyncExternalStore(
    (callback) => agent.subscribe(callback),
    () => selector(agent.getState()),
    () => selector(agent.getState()),
  );
}

export function useAgentStateById<T>(
  agentId: string,
  selector: (state: AgentState) => T,
): T {
  const task = useTask();
  const agent = task.getAgent(agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  return useSyncExternalStore(
    (callback) => agent.subscribe(callback),
    () => selector(agent.getState()),
    () => selector(agent.getState()),
  );
}

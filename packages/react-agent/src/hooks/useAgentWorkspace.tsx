"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { WorkspaceRuntime, type WorkspaceConfig } from "../runtime";
import type { TaskRuntime } from "../runtime";

const WorkspaceContext = createContext<WorkspaceRuntime | null>(null);

// Stable empty array for SSR
const EMPTY_TASKS: TaskRuntime[] = [];

export interface AgentWorkspaceProviderProps extends WorkspaceConfig {
  children: ReactNode;
}

export function AgentWorkspaceProvider({
  apiKey,
  baseUrl,
  children,
}: AgentWorkspaceProviderProps) {
  const runtime = useMemo(() => {
    return new WorkspaceRuntime({ apiKey, baseUrl });
  }, [apiKey, baseUrl]);

  return (
    <WorkspaceContext.Provider value={runtime}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useAgentWorkspace(): WorkspaceRuntime {
  const runtime = useContext(WorkspaceContext);
  if (!runtime) {
    throw new Error(
      "useAgentWorkspace must be used within an AgentWorkspaceProvider",
    );
  }
  return runtime;
}

export function useWorkspaceTasks() {
  const workspace = useAgentWorkspace();

  return useSyncExternalStore(
    (callback) => workspace.subscribe(callback),
    () => workspace.getTasks(),
    () => EMPTY_TASKS,
  );
}

"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
  type ComponentPropsWithoutRef,
} from "react";
import { TaskProvider, useTaskState } from "../../hooks";
import { createActionButton } from "../../actions/createActionButton";
import type { AgentState } from "../../runtime/types";

export interface AgentTreeNode {
  agent: AgentState;
  children: AgentTreeNode[];
}

interface TaskTreeContextValue {
  expandedNodes: Set<string>;
  selectedAgentId: string | null;
  toggleNode: (agentId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  selectAgent: (agentId: string | null) => void;
  allAgentIds: string[];
}

const TaskTreeContext = createContext<TaskTreeContextValue | null>(null);

function useTaskTreeContext() {
  const ctx = useContext(TaskTreeContext);
  if (!ctx) {
    throw new Error(
      "useTaskTreeContext must be used within TaskTreePrimitive.Root",
    );
  }
  return ctx;
}

function useAgentTree(): AgentTreeNode[] {
  const agents = useTaskState((s) => s.agents);

  return useMemo(() => {
    const roots = agents.filter((a) => !a.parentAgentId);

    const buildNode = (agent: AgentState): AgentTreeNode => ({
      agent,
      children: agents
        .filter((a) => a.parentAgentId === agent.id)
        .map(buildNode),
    });

    return roots.map(buildNode);
  }, [agents]);
}

export interface TaskTreeRootProps {
  taskId: string;
  onSelectAgent?: (agentId: string | null) => void;
  children: ReactNode;
}

function TaskTreeRoot({ taskId, onSelectAgent, children }: TaskTreeRootProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [allAgentIds, setAllAgentIds] = useState<string[]>([]);

  const contextValue = useMemo(
    () => ({
      expandedNodes,
      selectedAgentId,
      allAgentIds,
      toggleNode: (agentId: string) => {
        setExpandedNodes((prev) => {
          const next = new Set(prev);
          if (next.has(agentId)) {
            next.delete(agentId);
          } else {
            next.add(agentId);
          }
          return next;
        });
      },
      expandAll: () => {
        setExpandedNodes(new Set(allAgentIds));
      },
      collapseAll: () => {
        setExpandedNodes(new Set());
      },
      selectAgent: (agentId: string | null) => {
        setSelectedAgentId(agentId);
        onSelectAgent?.(agentId);
      },
    }),
    [expandedNodes, selectedAgentId, allAgentIds, onSelectAgent],
  );

  return (
    <TaskProvider taskId={taskId}>
      <TaskTreeContext.Provider value={contextValue}>
        <AgentIdCollector onAgentIds={setAllAgentIds}>
          {children}
        </AgentIdCollector>
      </TaskTreeContext.Provider>
    </TaskProvider>
  );
}

TaskTreeRoot.displayName = "TaskTreePrimitive.Root";

// Helper to collect all agent IDs for expandAll
function AgentIdCollector({
  onAgentIds,
  children,
}: {
  onAgentIds: (ids: string[]) => void;
  children: ReactNode;
}) {
  const agents = useTaskState((s) => s.agents);

  useMemo(() => {
    onAgentIds(agents.map((a) => a.id));
  }, [agents, onAgentIds]);

  return <>{children}</>;
}

export interface TaskTreeTreeProps {
  children: (nodes: AgentTreeNode[]) => ReactNode;
}

function TaskTreeTree({ children }: TaskTreeTreeProps) {
  const tree = useAgentTree();
  return <>{children(tree)}</>;
}

TaskTreeTree.displayName = "TaskTreePrimitive.Tree";

function TaskTreeSelectedAgentId(props: ComponentPropsWithoutRef<"span">) {
  const { selectedAgentId } = useTaskTreeContext();
  return <span {...props}>{selectedAgentId}</span>;
}

TaskTreeSelectedAgentId.displayName = "TaskTreePrimitive.SelectedAgentId";

export interface TaskTreeIsExpandedProps {
  agentId: string;
  children: (isExpanded: boolean) => ReactNode;
}

function TaskTreeIsExpanded({ agentId, children }: TaskTreeIsExpandedProps) {
  const { expandedNodes } = useTaskTreeContext();
  return <>{children(expandedNodes.has(agentId))}</>;
}

TaskTreeIsExpanded.displayName = "TaskTreePrimitive.IsExpanded";

// Action hooks
function useExpandAll() {
  const { expandAll, allAgentIds } = useTaskTreeContext();
  if (allAgentIds.length === 0) return null;
  return () => expandAll();
}

function useCollapseAll() {
  const { collapseAll, expandedNodes } = useTaskTreeContext();
  if (expandedNodes.size === 0) return null;
  return () => collapseAll();
}

const ExpandAll = createActionButton(
  "TaskTreePrimitive.ExpandAll",
  useExpandAll,
);

const CollapseAll = createActionButton(
  "TaskTreePrimitive.CollapseAll",
  useCollapseAll,
);

export const TaskTreePrimitive = {
  Root: TaskTreeRoot,
  Tree: TaskTreeTree,
  SelectedAgentId: TaskTreeSelectedAgentId,
  IsExpanded: TaskTreeIsExpanded,
  ExpandAll,
  CollapseAll,
};

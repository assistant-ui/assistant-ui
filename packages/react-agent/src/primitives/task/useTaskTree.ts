"use client";

import { useMemo } from "react";
import { useWorkspaceTasks } from "../../hooks/useAgentWorkspace";

export interface TaskNode {
  taskId: string;
  taskName: string;
  status: string;
  cost: number;
  createdAt: Date;
  completedAt: Date | undefined;
}

export interface AgentTreeNode {
  agentId: string;
  name: string;
  status: string;
  cost: number;
  taskId: string;
  parentAgentId: string | null;
  childAgentIds: string[];
  depth: number;
}

export interface AgentTreeData {
  agents: Map<string, Omit<AgentTreeNode, "depth">>;
  rootAgentIds: string[];
  flatList: AgentTreeNode[];
}

export function useTaskTree(): TaskNode[] {
  const tasks = useWorkspaceTasks();

  return useMemo(() => {
    return tasks.map((task) => ({
      taskId: task.id,
      taskName: task.getState().title || task.id,
      status: task.getState().status,
      cost: task.getState().cost,
      createdAt: task.getState().createdAt,
      completedAt: task.getState().completedAt,
    }));
  }, [tasks]);
}

export function useAgentTree(): AgentTreeData {
  const tasks = useWorkspaceTasks();

  return useMemo(() => {
    const agents = new Map();
    const allAgentIds = new Set<string>();
    const childToParentMap = new Map<string, string>();

    tasks.forEach((task) => {
      const taskState = task.getState();
      const taskAgents = taskState.agents || [];
      taskAgents.forEach((agent) => {
        allAgentIds.add(agent.id);
        if (agent.parentAgentId) {
          childToParentMap.set(agent.id, agent.parentAgentId);
        }

        agents.set(agent.id, {
          agentId: agent.id,
          name: agent.name,
          status: agent.status,
          cost: agent.cost,
          taskId: task.id,
          parentAgentId: agent.parentAgentId,
          childAgentIds: agent.childAgentIds,
        });
      });
    });

    const rootAgentIds = Array.from(allAgentIds).filter(
      (id) => !childToParentMap.has(id),
    );

    const calculateDepth = (
      agentId: string,
      visited = new Set<string>(),
    ): number => {
      if (visited.has(agentId)) {
        return 0;
      }
      visited.add(agentId);

      const parentId = childToParentMap.get(agentId);
      if (!parentId) return 0;
      return calculateDepth(parentId, visited) + 1;
    };

    const flatList = Array.from(agents.values()).map((agent) => ({
      ...agent,
      depth: calculateDepth(agent.agentId),
    }));

    return {
      agents,
      rootAgentIds,
      flatList,
    };
  }, [tasks]);
}

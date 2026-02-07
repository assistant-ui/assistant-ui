"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { AgentProvider, useAgentState } from "../hooks";
import type { AgentEvent, AgentStatus } from "../runtime";

export interface AgentRootProps {
  agentId: string;
  children: ReactNode;
}

function AgentRoot({ agentId, children }: AgentRootProps) {
  return <AgentProvider agentId={agentId}>{children}</AgentProvider>;
}

AgentRoot.displayName = "AgentPrimitive.Root";

function AgentName(props: ComponentPropsWithoutRef<"span">) {
  const name = useAgentState((s) => s.name);
  return <span {...props}>{name}</span>;
}

AgentName.displayName = "AgentPrimitive.Name";

export interface AgentStatusProps extends ComponentPropsWithoutRef<"span"> {
  showIcon?: boolean;
}

const statusIcons: Record<AgentStatus, string> = {
  running: "\uD83D\uDD04",
  paused: "\u23F8\uFE0F",
  completed: "\u2705",
  failed: "\u274C",
};

const AgentStatus = Object.assign(
  function AgentStatus({ showIcon = true, ...props }: AgentStatusProps) {
    const status = useAgentState((s) => s.status);
    return (
      <span {...props}>
        {showIcon && `${statusIcons[status]} `}
        {status}
      </span>
    );
  },
  { displayName: "AgentPrimitive.Status" },
);

export interface AgentCostProps extends ComponentPropsWithoutRef<"span"> {
  precision?: number;
}

function AgentCost({ precision = 4, ...props }: AgentCostProps) {
  const cost = useAgentState((s) => s.cost);
  return <span {...props}>${cost.toFixed(precision)}</span>;
}

AgentCost.displayName = "AgentPrimitive.Cost";

export interface AgentEventsProps {
  children: (events: AgentEvent[]) => ReactNode;
}

function AgentEvents({ children }: AgentEventsProps) {
  const events = useAgentState((s) => s.events);
  return <>{children(events)}</>;
}

AgentEvents.displayName = "AgentPrimitive.Events";

export interface AgentChildrenProps {
  children: (childIds: string[]) => ReactNode;
}

function AgentChildren({ children }: AgentChildrenProps) {
  const childIds = useAgentState((s) => s.childAgentIds);
  return <>{children(childIds)}</>;
}

AgentChildren.displayName = "AgentPrimitive.Children";

export interface AgentIfProps {
  status: AgentStatus | AgentStatus[];
  children: ReactNode;
}

function AgentIf({ status, children }: AgentIfProps) {
  const currentStatus = useAgentState((s) => s.status);
  const statuses = Array.isArray(status) ? status : [status];

  if (!statuses.includes(currentStatus)) {
    return null;
  }

  return <>{children}</>;
}

AgentIf.displayName = "AgentPrimitive.If";

function AgentPause() {
  return null;
}

AgentPause.displayName = "AgentPrimitive.Pause";

function AgentResume() {
  return null;
}

AgentResume.displayName = "AgentPrimitive.Resume";

function AgentCancel() {
  return null;
}

AgentCancel.displayName = "AgentPrimitive.Cancel";

export const AgentPrimitive = {
  Root: AgentRoot,
  Name: AgentName,
  Status: AgentStatus,
  Cost: AgentCost,
  Events: AgentEvents,
  Children: AgentChildren,
  If: AgentIf,
  Pause: AgentPause,
  Resume: AgentResume,
  Cancel: AgentCancel,
};

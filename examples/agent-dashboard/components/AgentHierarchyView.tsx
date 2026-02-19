"use client";

import { useState } from "react";
import type { AgentState } from "@assistant-ui/react-agent";
import {
  ChevronRight,
  ChevronDown,
  Cpu,
  Loader2,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";

export interface AgentHierarchyViewProps {
  agents: AgentState[];
  selectedAgentId?: string | undefined;
  onSelectAgent?: ((agentId: string) => void) | undefined;
  className?: string | undefined;
}

interface AgentNode {
  agent: AgentState;
  children: AgentNode[];
}

function buildAgentTree(agents: AgentState[]): AgentNode[] {
  const roots = agents.filter((a) => !a.parentAgentId);

  const buildNode = (agent: AgentState): AgentNode => {
    const children = agents
      .filter((a) => a.parentAgentId === agent.id)
      .map(buildNode);
    return { agent, children };
  };

  return roots.map(buildNode);
}

const statusConfig = {
  running: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: "text-blue-500",
    badge: "default" as const,
  },
  paused: {
    icon: <PauseCircle className="h-4 w-4" />,
    color: "text-warning",
    badge: "warning" as const,
  },
  completed: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-success",
    badge: "success" as const,
  },
  failed: {
    icon: <XCircle className="h-4 w-4" />,
    color: "text-destructive",
    badge: "destructive" as const,
  },
};

function AgentTreeNode({
  node,
  depth = 0,
  selectedAgentId,
  onSelectAgent,
}: {
  node: AgentNode;
  depth?: number | undefined;
  selectedAgentId?: string | undefined;
  onSelectAgent?: ((agentId: string) => void) | undefined;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { agent, children } = node;
  const hasChildren = children.length > 0;
  const isSelected = agent.id === selectedAgentId;
  const isRoot = depth === 0;
  const status = statusConfig[agent.status];

  return (
    <div className="relative">
      {/* Vertical connector line for non-root items */}
      {depth > 0 && (
        <div
          className="absolute top-0 h-full w-px bg-border"
          style={{ left: `${(depth - 1) * 24 + 12}px` }}
        />
      )}

      <div
        className="relative flex items-center"
        style={{ paddingLeft: `${depth * 24}px` }}
      >
        {/* Horizontal connector line */}
        {depth > 0 && (
          <div
            className="absolute top-1/2 h-px w-3 bg-border"
            style={{ left: `${(depth - 1) * 24 + 12}px` }}
          />
        )}

        <button
          type="button"
          onClick={() => onSelectAgent?.(agent.id)}
          className={cn(
            "fade-in slide-in-from-left-1 group flex flex-1 animate-in items-center gap-3 rounded-xl p-2.5 text-left transition-all duration-150",
            isSelected
              ? "bg-primary/10 ring-1 ring-primary/30"
              : "hover:-translate-x-0.5 hover:bg-muted/50",
          )}
        >
          {/* Expand/Collapse toggle */}
          {hasChildren ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }
              }}
              className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
          ) : (
            <div className="h-5 w-5 shrink-0" />
          )}

          {/* Status Icon */}
          <span className={cn("shrink-0", status.color)}>{status.icon}</span>

          {/* Agent Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "truncate text-sm",
                  isSelected ? "font-semibold" : "font-medium",
                )}
              >
                {agent.name}
              </span>
              {isRoot ? (
                <Badge
                  variant="default"
                  className="shrink-0 bg-primary/15 text-primary"
                >
                  Lead
                </Badge>
              ) : (
                <Badge variant="secondary" className="shrink-0">
                  Worker
                </Badge>
              )}
            </div>
          </div>

          {/* Metrics */}
          <div className="flex shrink-0 items-center gap-3 text-muted-foreground text-xs">
            <span className="flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              {agent.events.length}
            </span>
            <span className="font-mono">${(agent.cost ?? 0).toFixed(4)}</span>
          </div>
        </button>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="fade-in slide-in-from-top-2 relative animate-in duration-150">
          {children.map((child) => (
            <AgentTreeNode
              key={child.agent.id}
              node={child}
              depth={depth + 1}
              selectedAgentId={selectedAgentId}
              onSelectAgent={onSelectAgent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AgentHierarchyView({
  agents,
  selectedAgentId,
  onSelectAgent,
  className,
}: AgentHierarchyViewProps) {
  const tree = buildAgentTree(agents);
  const runningCount = agents.filter((a) => a.status === "running").length;
  const completedCount = agents.filter((a) => a.status === "completed").length;

  if (agents.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border border-border bg-card p-8",
          className,
        )}
      >
        <Users className="mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-center text-muted-foreground text-sm">
          No agents yet
        </p>
        <p className="mt-1 text-center text-muted-foreground/70 text-xs">
          Agents will appear here when spawned
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fade-in slide-in-from-bottom-2 animate-in rounded-2xl border border-border bg-card shadow-sm duration-200",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-border border-b px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="rounded-full bg-primary/10 p-1.5">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold text-base">Agent Hierarchy</h3>
        </div>
        <div className="flex items-center gap-2">
          {runningCount > 0 && (
            <Badge variant="default" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {runningCount} running
            </Badge>
          )}
          {completedCount > 0 && (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {completedCount} done
            </Badge>
          )}
        </div>
      </div>

      {/* Summary row */}
      <div className="flex items-center gap-4 border-border border-b bg-muted/50 px-4 py-2.5 text-muted-foreground text-xs">
        <span className="font-medium">
          {agents.length} agent{agents.length !== 1 ? "s" : ""}
        </span>
        <span className="text-muted-foreground/50">•</span>
        <span>
          {tree.length} root{tree.length !== 1 ? "s" : ""}
        </span>
        <span className="text-muted-foreground/50">•</span>
        <span className="font-mono">
          ${agents.reduce((sum, a) => sum + (a.cost ?? 0), 0).toFixed(4)} total
        </span>
      </div>

      {/* Tree */}
      <div className="p-2">
        {tree.map((node) => (
          <AgentTreeNode
            key={node.agent.id}
            node={node}
            selectedAgentId={selectedAgentId}
            onSelectAgent={onSelectAgent}
          />
        ))}
      </div>
    </div>
  );
}

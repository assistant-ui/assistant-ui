"use client";

import { useState } from "react";
import {
  TaskPrimitive,
  useTask,
  useTaskState,
  type AgentEvent,
} from "@assistant-ui/react-agent";
import {
  Activity,
  Clock,
  ChevronDown,
  ChevronUp,
  List,
  LayoutGrid,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EventStream } from "./EventStream";
import { ThinkingDisplay } from "./ThinkingDisplay";
import { CostDashboard } from "./CostDashboard";
import { EnhancedApproval } from "./EnhancedApproval";
import { ToolExecutionCard, eventsToToolExecutions } from "./ToolExecutionCard";

type ViewMode = "stream" | "tools" | "split";

function TaskDetailContent({ onClose }: { onClose?: () => void }) {
  const task = useTask();
  const status = useTaskState((s) => s.status);
  const title = useTaskState((s) => s.title);
  const cost = useTaskState((s) => s.cost);
  const createdAt = useTaskState((s) => s.createdAt);
  const completedAt = useTaskState((s) => s.completedAt);
  const agents = useTaskState((s) => s.agents);
  const pendingApprovalsRaw = useTaskState((s) => s.pendingApprovals);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [showCostPanel, setShowCostPanel] = useState(true);

  // Collect all events from all agents
  const allEvents: AgentEvent[] = agents.flatMap((agent) => agent.events);
  const toolExecutions = eventsToToolExecutions(allEvents);

  const pendingApprovals = pendingApprovalsRaw.filter(
    (a) => a.status === "pending",
  );

  const formatDuration = () => {
    const start = new Date(createdAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : Date.now();
    const seconds = Math.floor((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const statusColors = {
    queued: "text-muted-foreground",
    running: "text-blue-500",
    completed: "text-success",
    failed: "text-destructive",
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-border border-b bg-card px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Activity
              className={cn("h-4 w-4 shrink-0", statusColors[status])}
            />
            <h2 className="truncate font-semibold">{title}</h2>
          </div>
          <div className="mt-1 flex items-center gap-3 text-muted-foreground text-sm">
            <TaskPrimitive.Status showIcon className="capitalize" />
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration()}
            </span>
            <span>${cost.toFixed(4)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-border bg-muted/50 p-1">
            <button
              type="button"
              onClick={() => setViewMode("stream")}
              className={cn(
                "rounded-md px-2 py-1 text-xs transition-colors",
                viewMode === "stream"
                  ? "bg-background shadow-sm"
                  : "hover:bg-background/50",
              )}
              title="Event Stream"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("tools")}
              className={cn(
                "rounded-md px-2 py-1 text-xs transition-colors",
                viewMode === "tools"
                  ? "bg-background shadow-sm"
                  : "hover:bg-background/50",
              )}
              title="Tool Cards"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={cn(
                "rounded-md px-2 py-1 text-xs transition-colors",
                viewMode === "split"
                  ? "bg-background shadow-sm"
                  : "hover:bg-background/50",
              )}
              title="Split View"
            >
              <LayoutGrid className="h-4 w-4 rotate-90" />
            </button>
          </div>

          {(status === "running" || status === "queued") && (
            <TaskPrimitive.Cancel className="rounded-lg bg-destructive/10 px-3 py-1.5 text-destructive text-sm transition-colors hover:bg-destructive/20">
              Cancel
            </TaskPrimitive.Cancel>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Pending Approvals - Always on top */}
      {pendingApprovals.length > 0 && (
        <div className="border-border border-b bg-warning/5 p-4">
          <div className="space-y-3">
            {pendingApprovals.map((approval) => (
              <EnhancedApproval key={approval.id} approvalId={approval.id} />
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left/Main Panel */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Thinking Display */}
          <ThinkingDisplay events={allEvents} className="mx-4 mt-4" />

          {/* Content based on view mode */}
          <div className="min-h-0 flex-1 overflow-auto p-4">
            {viewMode === "stream" && (
              <EventStream events={allEvents} className="h-full" />
            )}

            {viewMode === "tools" && (
              <div className="space-y-3">
                {toolExecutions.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                    No tool executions yet...
                  </div>
                ) : (
                  toolExecutions.map((execution) => (
                    <ToolExecutionCard
                      key={execution.id}
                      execution={execution}
                    />
                  ))
                )}
              </div>
            )}

            {viewMode === "split" && (
              <div className="grid h-full grid-cols-2 gap-4">
                <EventStream events={allEvents} className="h-full" />
                <div className="space-y-3 overflow-auto">
                  {toolExecutions.map((execution) => (
                    <ToolExecutionCard
                      key={execution.id}
                      execution={execution}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Cost Dashboard */}
        <div
          className={cn(
            "border-border border-l transition-all",
            showCostPanel ? "w-72" : "w-0",
          )}
        >
          {showCostPanel && (
            <div className="h-full overflow-auto p-4">
              <CostDashboard />
            </div>
          )}
        </div>
      </div>

      {/* Cost Panel Toggle */}
      <button
        type="button"
        onClick={() => setShowCostPanel(!showCostPanel)}
        className="absolute right-4 bottom-4 rounded-full bg-card p-2 shadow-lg transition-colors hover:bg-muted"
        title={showCostPanel ? "Hide cost panel" : "Show cost panel"}
      >
        {showCostPanel ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronUp className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

export interface TaskDetailViewProps {
  taskId: string;
  onClose?: () => void;
  className?: string;
}

export function TaskDetailView({
  taskId,
  onClose,
  className,
}: TaskDetailViewProps) {
  return (
    <TaskPrimitive.Root taskId={taskId}>
      <div className={cn("relative h-full bg-background", className)}>
        <TaskDetailContent onClose={onClose} />
      </div>
    </TaskPrimitive.Root>
  );
}

"use client";

import {
  TaskPrimitive,
  AgentPrimitive,
  ApprovalPrimitive,
} from "@assistant-ui/react-agent";
import type { AgentEvent } from "@assistant-ui/react-agent";
import { ChevronDown, ChevronRight, Terminal, AlertCircle } from "lucide-react";
import { useState } from "react";

export interface TaskCardProps {
  taskId: string;
}

export function TaskCard({ taskId }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <TaskPrimitive.Root taskId={taskId}>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* Task Header */}
        <div className="flex items-center justify-between border-border border-b bg-muted/30 p-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="rounded p-1 hover:bg-muted"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            <div>
              <TaskPrimitive.Title className="font-medium text-card-foreground" />
              <div className="mt-1 flex items-center gap-2 text-muted-foreground text-sm">
                <TaskPrimitive.Status showIcon />
                <span>|</span>
                <TaskPrimitive.Cost precision={4} />
              </div>
            </div>
          </div>
          <TaskPrimitive.Cancel className="rounded bg-destructive px-3 py-1.5 text-destructive-foreground text-sm transition-colors hover:bg-destructive/90">
            Cancel
          </TaskPrimitive.Cancel>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="space-y-4 p-4">
            {/* Pending Approvals */}
            <TaskPrimitive.Approvals>
              {(approvals) =>
                approvals.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="flex items-center gap-2 font-medium text-sm text-warning">
                      <AlertCircle className="h-4 w-4" />
                      Pending Approvals ({approvals.length})
                    </h4>
                    {approvals.map((approval) => (
                      <ApprovalCard
                        key={approval.id}
                        approvalId={approval.id}
                      />
                    ))}
                  </div>
                )
              }
            </TaskPrimitive.Approvals>

            {/* Agent Activity */}
            <TaskPrimitive.Agents>
              {(agents) =>
                agents.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-muted-foreground text-sm">
                      Agent Activity
                    </h4>
                    {agents.map((agent) => (
                      <AgentActivity key={agent.id} agentId={agent.id} />
                    ))}
                  </div>
                )
              }
            </TaskPrimitive.Agents>
          </div>
        )}
      </div>
    </TaskPrimitive.Root>
  );
}

function ApprovalCard({ approvalId }: { approvalId: string }) {
  return (
    <ApprovalPrimitive.Root approvalId={approvalId}>
      <div className="rounded-md border border-warning/50 bg-warning/10 p-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-warning" />
              <ApprovalPrimitive.ToolName className="font-medium font-mono text-sm" />
            </div>
            <ApprovalPrimitive.Reason className="text-muted-foreground text-sm" />
            <ApprovalPrimitive.ToolInput
              format="json"
              className="mt-2 max-h-32 overflow-x-auto rounded bg-muted p-2 font-mono text-xs"
            />
          </div>
          <div className="flex shrink-0 gap-2">
            <ApprovalPrimitive.Approve className="rounded bg-success px-3 py-1.5 text-sm text-success-foreground transition-colors hover:bg-success/90">
              Allow
            </ApprovalPrimitive.Approve>
            <ApprovalPrimitive.Deny className="rounded bg-destructive px-3 py-1.5 text-destructive-foreground text-sm transition-colors hover:bg-destructive/90">
              Deny
            </ApprovalPrimitive.Deny>
          </div>
        </div>
      </div>
    </ApprovalPrimitive.Root>
  );
}

function AgentActivity({ agentId }: { agentId: string }) {
  const [showEvents, setShowEvents] = useState(false);

  return (
    <AgentPrimitive.Root agentId={agentId}>
      <div className="rounded-md border border-border bg-muted/20 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AgentPrimitive.Name className="font-medium text-sm" />
            <AgentPrimitive.Status
              showIcon
              className="text-muted-foreground text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <AgentPrimitive.Cost
              precision={4}
              className="text-muted-foreground text-xs"
            />
            <button
              type="button"
              onClick={() => setShowEvents(!showEvents)}
              className="text-primary text-xs hover:underline"
            >
              {showEvents ? "Hide" : "Show"} events
            </button>
          </div>
        </div>

        {showEvents && (
          <AgentPrimitive.Events>
            {(events) => (
              <div className="mt-3 max-h-48 space-y-1 overflow-y-auto">
                {events.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    No events yet...
                  </p>
                ) : (
                  events.map((event) => (
                    <EventItem key={event.id} event={event} />
                  ))
                )}
              </div>
            )}
          </AgentPrimitive.Events>
        )}
      </div>
    </AgentPrimitive.Root>
  );
}

function EventItem({ event }: { event: AgentEvent }) {
  const getEventIcon = () => {
    switch (event.type) {
      case "tool_call":
        return "\uD83D\uDD27";
      case "tool_result":
        return "\u2705";
      case "reasoning":
        return "\uD83D\uDCA1";
      case "message":
        return "\uD83D\uDCAC";
      case "error":
        return "\u274C";
      default:
        return "\u2022";
    }
  };

  const getEventContent = () => {
    const content = event.content as Record<string, unknown>;
    switch (event.type) {
      case "tool_call":
        return `${content["toolName"]}(...)`;
      case "tool_result":
        return String(content["result"]).slice(0, 100);
      case "reasoning":
      case "message":
        return String(content["text"]).slice(0, 100);
      case "error":
        return String(content["message"]);
      default:
        return JSON.stringify(content).slice(0, 100);
    }
  };

  return (
    <div className="flex items-start gap-2 text-xs">
      <span>{getEventIcon()}</span>
      <span className="font-mono text-muted-foreground">{event.type}</span>
      <span className="flex-1 truncate">{getEventContent()}</span>
    </div>
  );
}

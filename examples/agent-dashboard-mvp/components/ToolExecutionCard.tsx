"use client";

import { useState } from "react";
import {
  Terminal,
  FileText,
  Edit3,
  FolderSearch,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";
import type { AgentEvent } from "@assistant-ui/react-agent";

const toolIcons: Record<string, React.ReactNode> = {
  Bash: <Terminal className="h-4 w-4" />,
  Read: <FileText className="h-4 w-4" />,
  Write: <Edit3 className="h-4 w-4" />,
  Edit: <Edit3 className="h-4 w-4" />,
  Glob: <FolderSearch className="h-4 w-4" />,
  Grep: <Search className="h-4 w-4" />,
};

interface ToolExecution {
  id: string;
  toolName: string;
  toolInput: unknown;
  toolCallId: string;
  status: "running" | "success" | "error";
  result?: unknown;
  duration?: number;
  startTime: Date;
  endTime?: Date;
}

export interface ToolExecutionCardProps {
  execution: ToolExecution;
  className?: string;
}

export function ToolExecutionCard({
  execution,
  className,
}: ToolExecutionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const icon = toolIcons[execution.toolName] || (
    <Terminal className="h-4 w-4" />
  );

  const statusIcon = {
    running: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
    success: <CheckCircle2 className="h-4 w-4 text-success" />,
    error: <XCircle className="h-4 w-4 text-destructive" />,
  }[execution.status];

  const formatInput = () => {
    const input = execution.toolInput as Record<string, unknown>;
    if (execution.toolName === "Bash" && input.command) {
      return String(input.command);
    }
    if (
      (execution.toolName === "Read" || execution.toolName === "Write") &&
      input.path
    ) {
      return String(input.path);
    }
    return JSON.stringify(input, null, 2);
  };

  const formatDuration = () => {
    if (!execution.duration) return null;
    if (execution.duration < 1000) return `${execution.duration}ms`;
    return `${(execution.duration / 1000).toFixed(1)}s`;
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-sm",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <span className="shrink-0 text-muted-foreground">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <code className="font-medium font-mono text-sm">
              {execution.toolName}
            </code>
            {execution.status === "running" && (
              <Badge variant="secondary" className="animate-pulse">
                Running
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate font-mono text-muted-foreground text-xs">
            {formatInput().slice(0, 60)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {formatDuration() && (
            <span className="flex items-center gap-1 text-muted-foreground text-xs">
              <Clock className="h-3 w-3" />
              {formatDuration()}
            </span>
          )}
          {statusIcon}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-border border-t bg-muted/30">
          {/* Input */}
          <div className="border-border border-b p-3">
            <h4 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Input
            </h4>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-background p-2 font-mono text-xs">
              {formatInput()}
            </pre>
          </div>

          {/* Output */}
          {execution.result !== undefined && (
            <div className="p-3">
              <h4 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Output
              </h4>
              <pre
                className={cn(
                  "max-h-48 overflow-auto whitespace-pre-wrap rounded p-2 font-mono text-xs",
                  execution.status === "error"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-background",
                )}
              >
                {typeof execution.result === "string"
                  ? execution.result
                  : JSON.stringify(execution.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper to convert events to tool executions
export function eventsToToolExecutions(events: AgentEvent[]): ToolExecution[] {
  const executions: Map<string, ToolExecution> = new Map();

  for (const event of events) {
    if (event.type === "tool_call") {
      const content = event.content as any;
      executions.set(content.toolCallId, {
        id: event.id,
        toolName: content.toolName,
        toolInput: content.toolInput,
        toolCallId: content.toolCallId,
        status: "running",
        startTime: new Date(event.timestamp),
      });
    } else if (event.type === "tool_result") {
      const content = event.content as any;
      const execution = executions.get(content.toolCallId);
      if (execution) {
        execution.status = content.isError ? "error" : "success";
        execution.result = content.result;
        execution.endTime = new Date(event.timestamp);
        execution.duration =
          execution.endTime.getTime() - execution.startTime.getTime();
      }
    }
  }

  return Array.from(executions.values());
}

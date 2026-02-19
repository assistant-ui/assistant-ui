"use client";

import React, { type RefObject } from "react";
import type { TaskState } from "@assistant-ui/react-agent";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Pause,
  PlayCircle,
  StopCircle,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface SessionRowProps {
  task: TaskState;
  isSelected: boolean;
  onClick?: () => void;
  className?: string;
}

const statusConfig: Record<
  string,
  {
    icon: React.ReactNode;
    color: string;
    badge:
      | "default"
      | "secondary"
      | "success"
      | "destructive"
      | "warning"
      | "outline";
    label: string;
  }
> = {
  draft: {
    icon: <Clock className="h-4 w-4" />,
    color: "text-muted-foreground",
    badge: "outline" as const,
    label: "Draft",
  },
  starting: {
    icon: <PlayCircle className="h-4 w-4 animate-pulse" />,
    color: "text-blue-400",
    badge: "secondary" as const,
    label: "Starting",
  },
  running: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: "text-blue-500",
    badge: "default" as const,
    label: "Running",
  },
  waiting_input: {
    icon: <Pause className="h-4 w-4" />,
    color: "text-amber-500",
    badge: "warning" as const,
    label: "Waiting",
  },
  completed: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-success",
    badge: "success" as const,
    label: "Completed",
  },
  failed: {
    icon: <XCircle className="h-4 w-4" />,
    color: "text-destructive",
    badge: "destructive" as const,
    label: "Failed",
  },
  interrupting: {
    icon: <StopCircle className="h-4 w-4 animate-pulse" />,
    color: "text-orange-500",
    badge: "warning" as const,
    label: "Stopping",
  },
  interrupted: {
    icon: <StopCircle className="h-4 w-4" />,
    color: "text-orange-400",
    badge: "secondary" as const,
    label: "Interrupted",
  },
  discarded: {
    icon: <Trash2 className="h-4 w-4" />,
    color: "text-muted-foreground",
    badge: "outline" as const,
    label: "Discarded",
  },
};

// Default fallback for unknown statuses
const defaultStatus = {
  icon: <Clock className="h-4 w-4" />,
  color: "text-muted-foreground",
  badge: "secondary" as const,
  label: "Unknown",
};

export const SessionRow = ({
  task,
  isSelected,
  onClick,
  className,
  ref,
}: SessionRowProps & { ref?: RefObject<HTMLButtonElement | null> }) => {
  const status = statusConfig[task.status] || defaultStatus;
  const pendingCount = task.pendingApprovals.filter(
    (a) => a.status === "pending",
  ).length;

  const formatDuration = () => {
    const start = new Date(task.createdAt).getTime();
    const end = task.completedAt
      ? new Date(task.completedAt).getTime()
      : Date.now();
    const seconds = Math.floor((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const d = new Date(date);
    if (d.toDateString() === now.toDateString()) {
      return "Today";
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-4 border-border border-b px-6 py-4 text-left transition-colors",
        isSelected
          ? "bg-primary/5 ring-2 ring-primary/20 ring-inset"
          : "hover:bg-muted/50",
        className,
      )}
    >
      {/* Status Icon */}
      <span className={cn("shrink-0", status.color)}>{status.icon}</span>

      {/* Title & Status */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{task.title}</span>
          {pendingCount > 0 && (
            <Badge variant="warning" className="shrink-0 gap-1">
              <AlertCircle className="h-3 w-3" />
              {pendingCount} pending
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-muted-foreground text-sm">
          {task.agents.length} agent{task.agents.length !== 1 ? "s" : ""} •{" "}
          {task.agents.reduce((sum, a) => sum + a.events.length, 0)} events
        </p>
      </div>

      {/* Cost */}
      <div className="shrink-0 text-right">
        <span className="font-mono text-sm">${task.cost.toFixed(4)}</span>
        <p className="text-muted-foreground text-xs">cost</p>
      </div>

      {/* Duration */}
      <div className="w-20 shrink-0 text-right">
        <span className="font-mono text-sm" suppressHydrationWarning>
          {formatDuration()}
        </span>
        <p className="text-muted-foreground text-xs">duration</p>
      </div>

      {/* Created */}
      <div className="w-24 shrink-0 text-right">
        <span className="text-sm" suppressHydrationWarning>
          {formatTime(task.createdAt)}
        </span>
        <p className="text-muted-foreground text-xs" suppressHydrationWarning>
          {formatDate(task.createdAt)}
        </p>
      </div>

      {/* Status Badge */}
      <Badge variant={status.badge} className="w-24 shrink-0 justify-center">
        {status.label}
      </Badge>
    </button>
  );
};

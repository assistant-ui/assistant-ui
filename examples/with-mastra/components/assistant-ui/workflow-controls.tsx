"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  StopCircle,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

export interface WorkflowStep {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "error";
}

export interface WorkflowControlsProps {
  workflowId: string;
  status?: "idle" | "running" | "paused" | "completed" | "error";
  progress?: number;
  steps?: WorkflowStep[];
  showSteps?: boolean;
  allowPause?: boolean;
  onStart?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onReset?: () => void;
  className?: string;
}

/**
 * WorkflowControls component for managing workflow execution.
 *
 * @example
 * ```tsx
 * import { WorkflowControls } from "@/components/assistant-ui/workflow-controls";
 *
 * <WorkflowControls
 *   workflowId="my-workflow"
 *   status="running"
 *   progress={50}
 *   showSteps={true}
 *   allowPause={true}
 * />
 * ```
 */
export function WorkflowControls({
  workflowId,
  status = "idle",
  progress = 0,
  steps,
  showSteps = true,
  allowPause = true,
  onStart,
  onPause,
  onStop,
  onReset,
  className,
}: WorkflowControlsProps) {
  const statusConfig = {
    idle: {
      icon: Play,
      label: "Ready",
      color: "text-muted-foreground",
      animated: false,
    },
    running: {
      icon: Loader2,
      label: "Running",
      color: "text-blue-600 dark:text-blue-400",
      animated: true,
    },
    paused: {
      icon: Pause,
      label: "Paused",
      color: "text-yellow-600 dark:text-yellow-400",
      animated: false,
    },
    completed: {
      icon: CheckCircle2,
      label: "Completed",
      color: "text-green-600 dark:text-green-400",
      animated: false,
    },
    error: {
      icon: AlertCircle,
      label: "Error",
      color: "text-red-600 dark:text-red-400",
      animated: false,
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div
      className={cn(
        "border-border bg-muted/50 rounded-lg border p-4",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon
            className={cn(
              "h-4 w-4",
              config.color,
              config.animated && "animate-spin",
            )}
            aria-hidden="true"
          />
          <h3 className="text-sm font-semibold">Workflow</h3>
          <span className="text-muted-foreground text-xs">
            ({config.label})
          </span>
        </div>
        <span className="text-muted-foreground font-mono text-xs">
          {workflowId}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="text-muted-foreground mb-1 flex justify-between text-xs">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="bg-muted h-2 overflow-hidden rounded-full">
          <div
            className={cn(
              "h-full transition-all duration-300",
              status === "error"
                ? "bg-red-500"
                : status === "completed"
                  ? "bg-green-500"
                  : "bg-blue-500",
            )}
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Control buttons */}
      <div className="mb-4 flex gap-2">
        {status === "idle" && (
          <Button
            size="sm"
            onClick={onStart}
            disabled={!onStart}
            aria-label="Start workflow"
          >
            <Play className="mr-1.5 h-3.5 w-3.5" />
            Start
          </Button>
        )}

        {status === "running" && allowPause && (
          <Button
            size="sm"
            variant="outline"
            onClick={onPause}
            disabled={!onPause}
            aria-label="Pause workflow"
          >
            <Pause className="mr-1.5 h-3.5 w-3.5" />
            Pause
          </Button>
        )}

        {status === "paused" && (
          <Button
            size="sm"
            onClick={onStart}
            disabled={!onStart}
            aria-label="Resume workflow"
          >
            <Play className="mr-1.5 h-3.5 w-3.5" />
            Resume
          </Button>
        )}

        {(status === "running" || status === "paused") && (
          <Button
            size="sm"
            variant="destructive"
            onClick={onStop}
            disabled={!onStop}
            aria-label="Stop workflow"
          >
            <StopCircle className="mr-1.5 h-3.5 w-3.5" />
            Stop
          </Button>
        )}

        {(status === "completed" || status === "error") && (
          <Button
            size="sm"
            variant="outline"
            onClick={onReset}
            disabled={!onReset}
            aria-label="Reset workflow"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Reset
          </Button>
        )}
      </div>

      {/* Workflow steps */}
      {showSteps && steps && steps.length > 0 && (
        <div className="space-y-2">
          <div className="text-muted-foreground mb-2 text-xs font-semibold">
            Steps
          </div>
          {steps.map((step) => {
            const stepStatusConfig = {
              pending: {
                icon: "○",
                color: "text-muted-foreground",
              },
              running: {
                icon: "◐",
                color: "text-blue-600 dark:text-blue-400",
              },
              completed: {
                icon: "●",
                color: "text-green-600 dark:text-green-400",
              },
              error: {
                icon: "✕",
                color: "text-red-600 dark:text-red-400",
              },
            };

            const stepConfig = stepStatusConfig[step.status];

            return (
              <div key={step.id} className="flex items-center gap-2 text-sm">
                <span className={cn("font-mono", stepConfig.color)}>
                  {stepConfig.icon}
                </span>
                <span
                  className={cn(
                    step.status === "completed" &&
                      "text-muted-foreground line-through",
                  )}
                >
                  {step.name}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

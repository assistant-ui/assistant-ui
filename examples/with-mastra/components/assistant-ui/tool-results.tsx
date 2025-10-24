"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export interface ToolCallData {
  name: string;
  args?: Record<string, unknown>;
  state?: "running" | "success" | "error";
}

export interface ToolResultsProps {
  toolCall: ToolCallData;
  result?: unknown;
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  className?: string;
}

/**
 * ToolResults component displays enhanced tool execution results.
 *
 * @example
 * ```tsx
 * import { ToolResults } from "@/components/assistant-ui/tool-results";
 *
 * <ToolResults
 *   toolCall={{ name: "weatherTool", args: { location: "NYC" }, state: "success" }}
 *   result={{ temperature: 72, condition: "sunny" }}
 *   isExpanded={true}
 * />
 * ```
 */
export function ToolResults({
  toolCall,
  result,
  isExpanded: controlledExpanded,
  onExpandedChange,
  className,
}: ToolResultsProps) {
  const [internalExpanded, setInternalExpanded] = React.useState(false);
  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : internalExpanded;
  const { name, args, state: toolState = "success" } = toolCall;

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    if (!isControlled) {
      setInternalExpanded(newExpanded);
    }
    onExpandedChange?.(newExpanded);
  };

  const stateConfig = {
    running: {
      icon: Loader2,
      className:
        "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
      iconClassName: "h-4 w-4 animate-spin text-blue-600 dark:text-blue-400",
      label: "Running",
    },
    success: {
      icon: CheckCircle2,
      className:
        "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950",
      iconClassName: "h-4 w-4 text-green-600 dark:text-green-400",
      label: "Success",
    },
    error: {
      icon: XCircle,
      className: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
      iconClassName: "h-4 w-4 text-red-600 dark:text-red-400",
      label: "Error",
    },
  };

  const config = stateConfig[toolState];
  const StateIcon = config.icon;
  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

  return (
    <div
      className={cn(
        "my-2 overflow-hidden rounded-lg border transition-colors",
        config.className,
        className,
      )}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? "Collapse" : "Expand"} tool result for ${name}`}
      >
        <StateIcon className={config.iconClassName} aria-hidden="true" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              Using tool: <code className="font-mono">{name}</code>
            </span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-xs",
                toolState === "running" &&
                  "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                toolState === "success" &&
                  "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200",
                toolState === "error" &&
                  "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200",
              )}
            >
              {config.label}
            </span>
          </div>
        </div>

        <ChevronIcon
          className="text-muted-foreground h-4 w-4 flex-shrink-0"
          aria-hidden="true"
        />
      </button>

      {isExpanded && (
        <div className="space-y-2 px-3 pb-3">
          {args && Object.keys(args).length > 0 && (
            <div>
              <div className="text-muted-foreground mb-1 text-xs font-semibold">
                Arguments
              </div>
              <pre className="overflow-x-auto rounded bg-black/5 p-2 text-xs dark:bg-white/5">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}

          {result !== undefined && (
            <div>
              <div className="text-muted-foreground mb-1 text-xs font-semibold">
                Result
              </div>
              <pre className="overflow-x-auto rounded bg-black/5 p-2 text-xs dark:bg-white/5">
                {typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          {toolState === "error" && result !== undefined && (
            <div className="mt-2 text-xs text-red-600 dark:text-red-400">
              <span className="font-semibold">Error: </span>
              {String(
                typeof result === "string" ? result : JSON.stringify(result),
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

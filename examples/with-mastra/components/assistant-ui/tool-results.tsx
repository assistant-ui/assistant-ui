"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, XCircle, ChevronDown, ChevronRight } from "lucide-react";

export interface ToolCallData {
  name: string;
  args?: Record<string, unknown>;
  state?: "running" | "success" | "error";
}

export interface ToolResultsProps {
  toolCall: ToolCallData;
  result?: unknown;
  isExpanded?: boolean;
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
  className,
}: ToolResultsProps) {
  const [internalExpanded, setInternalExpanded] = React.useState(false);
  const isExpanded = controlledExpanded ?? internalExpanded;
  const { name, args, state: toolState = "success" } = toolCall;

  const stateConfig = {
    running: {
      icon: Loader2,
      className: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
      iconClassName: "h-4 w-4 animate-spin text-blue-600 dark:text-blue-400",
      label: "Running",
    },
    success: {
      icon: CheckCircle2,
      className: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950",
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
        "rounded-lg border my-2 overflow-hidden transition-colors",
        config.className,
        className,
      )}
    >
      <button
        onClick={() => setInternalExpanded(!internalExpanded)}
        className="flex items-center gap-3 p-3 w-full text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? "Collapse" : "Expand"} tool result for ${name}`}
      >
        <StateIcon className={config.iconClassName} aria-hidden="true" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              Using tool: <code className="font-mono">{name}</code>
            </span>
            <span
              className={cn(
                "text-xs px-1.5 py-0.5 rounded",
                toolState === "running" && "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                toolState === "success" && "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200",
                toolState === "error" && "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200",
              )}
            >
              {config.label}
            </span>
          </div>
        </div>

        <ChevronIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {args && Object.keys(args).length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1">
                Arguments
              </div>
              <pre className="text-xs bg-black/5 dark:bg-white/5 rounded p-2 overflow-x-auto">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}

          {result !== undefined && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1">
                Result
              </div>
              <pre className="text-xs bg-black/5 dark:bg-white/5 rounded p-2 overflow-x-auto">
                {typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          {toolState === "error" && result !== undefined && (
            <div className="text-xs text-red-600 dark:text-red-400 mt-2">
              <span className="font-semibold">Error: </span>
              {String(typeof result === "string" ? result : JSON.stringify(result))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

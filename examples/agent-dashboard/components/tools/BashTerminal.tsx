"use client";

import { useState } from "react";
import {
  Terminal,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface BashTerminalProps {
  command: string;
  output?: string;
  exitCode?: number;
  isError?: boolean;
  isRunning?: boolean;
  className?: string;
}

export function BashTerminal({
  command,
  output,
  exitCode,
  isError,
  isRunning,
  className,
}: BashTerminalProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasOutput = output && output.length > 0;
  const lines = output?.split("\n") || [];
  const previewLines = 5;
  const hasMoreLines = lines.length > previewLines;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-zinc-900 font-mono text-sm",
        isError ? "border-destructive/50" : "border-zinc-700",
        className,
      )}
    >
      {/* Command Line */}
      <div className="flex items-center gap-2 border-zinc-700 border-b bg-zinc-800 px-3 py-2">
        <Terminal className="h-4 w-4 text-zinc-400" />
        <span className="text-green-400">$</span>
        <code className="flex-1 truncate text-zinc-100">{command}</code>
        {isRunning ? (
          <span className="flex h-2 w-2">
            <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
          </span>
        ) : isError ? (
          <AlertCircle className="h-4 w-4 text-destructive" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-green-400" />
        )}
        {exitCode !== undefined && (
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-xs",
              exitCode === 0
                ? "bg-green-500/20 text-green-400"
                : "bg-destructive/20 text-destructive",
            )}
          >
            exit {exitCode}
          </span>
        )}
      </div>

      {/* Output */}
      {hasOutput && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute top-2 right-2 rounded bg-zinc-700/50 p-1 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
          <pre
            className={cn(
              "overflow-x-auto p-3 text-zinc-300",
              !isExpanded && "max-h-32",
            )}
          >
            {isExpanded ? output : lines.slice(0, previewLines).join("\n")}
            {!isExpanded && hasMoreLines && (
              <span className="text-zinc-500">
                {"\n"}... {lines.length - previewLines} more lines
              </span>
            )}
          </pre>
        </div>
      )}

      {/* Empty state when running */}
      {isRunning && !hasOutput && (
        <div className="flex items-center gap-2 p-3 text-zinc-500">
          <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
          Running...
        </div>
      )}
    </div>
  );
}

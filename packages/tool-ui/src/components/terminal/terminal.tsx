"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import Ansi from "ansi-to-react";
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Terminal as TerminalIcon,
  Clock,
} from "lucide-react";
import { Collapsible, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import type { TerminalProps } from "../../schemas/terminal";
import { cn } from "../../utils/cn";
import { formatDuration } from "../../utils/format";
import { normalizeActionsConfig } from "../../utils/actions-config";
import { Button } from "../shared/button";
import { Badge } from "../shared/badge";
import { ActionButtons } from "../shared/action-buttons";
import { TerminalProgress } from "./terminal-progress";

function useCopyToClipboard() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = useCallback(async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
  }, []);

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(null), 2000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [copied]);

  return { copied, copy };
}

export function Terminal({
  id,
  command,
  stdout,
  stderr,
  exitCode,
  durationMs,
  cwd,
  truncated,
  maxCollapsedLines,
  footerActions,
  onFooterAction,
  onBeforeFooterAction,
  isLoading,
  className,
}: TerminalProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { copied, copy } = useCopyToClipboard();

  const isSuccess = exitCode === 0;
  const hasOutput = stdout || stderr;
  const fullOutput = [stdout, stderr].filter(Boolean).join("\n");

  const lineCount = fullOutput.split("\n").length;
  const shouldCollapse = maxCollapsedLines && lineCount > maxCollapsedLines;
  const isCollapsed = shouldCollapse && !isExpanded;

  const normalizedFooterActions = useMemo(
    () => normalizeActionsConfig(footerActions),
    [footerActions],
  );

  const handleCopyCommand = useCallback(() => {
    copy(command, "command");
  }, [command, copy]);

  const handleCopyOutput = useCallback(() => {
    copy(fullOutput, "output");
  }, [fullOutput, copy]);

  if (isLoading) {
    return (
      <div
        className={cn("@container flex w-full min-w-80 flex-col gap-3", className)}
        data-tool-ui-id={id}
        aria-busy="true"
      >
        <div className="overflow-hidden rounded-lg border border-zinc-700 shadow-xs">
          <TerminalProgress />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("@container flex w-full min-w-80 flex-col gap-3", className)}
      data-tool-ui-id={id}
      data-slot="terminal"
    >
      <div className="overflow-hidden rounded-lg border border-zinc-700 shadow-xs">
        {/* Header */}
        <div className="flex items-center justify-between bg-zinc-800 px-4 py-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <TerminalIcon className="h-4 w-4 shrink-0 text-zinc-400" />
            <code className="truncate font-mono text-sm text-zinc-100">
              {cwd && <span className="text-zinc-500">{cwd}$ </span>}
              {command}
            </code>
          </div>
          <div className="flex items-center gap-2">
            {durationMs !== undefined && (
              <span className="flex items-center gap-1 text-xs text-zinc-400">
                <Clock className="h-3 w-3" />
                {formatDuration(durationMs)}
              </span>
            )}
            <Badge
              variant={isSuccess ? "default" : "destructive"}
              className={cn(
                "font-mono text-xs",
                isSuccess && "bg-green-600 hover:bg-green-600",
              )}
            >
              {exitCode}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyCommand}
              className="h-7 w-7 p-0 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100"
              aria-label={copied === "command" ? "Copied" : "Copy command"}
            >
              {copied === "command" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Output */}
        {hasOutput && (
          <Collapsible open={!isCollapsed}>
            <div
              className={cn(
                "relative bg-zinc-900 font-mono text-sm",
                isCollapsed && "max-h-[200px] overflow-hidden",
              )}
            >
              <div className="overflow-x-auto p-4">
                {stdout && (
                  <div className="break-all whitespace-pre-wrap text-zinc-100">
                    <Ansi>{stdout}</Ansi>
                  </div>
                )}
                {stderr && (
                  <div className="mt-2 break-all whitespace-pre-wrap text-red-400">
                    <Ansi>{stderr}</Ansi>
                  </div>
                )}
                {truncated && (
                  <div className="mt-2 text-xs text-zinc-500 italic">
                    Output truncated...
                  </div>
                )}
              </div>

              {/* Copy output button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyOutput}
                className="absolute top-2 right-2 h-7 w-7 p-0 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
                aria-label={copied === "output" ? "Copied" : "Copy output"}
              >
                {copied === "output" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>

              {/* Collapsed gradient overlay */}
              {isCollapsed && (
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-900 to-transparent" />
              )}
            </div>

            {shouldCollapse && (
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-full rounded-none border-t border-zinc-700 bg-zinc-800 py-2 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100"
                >
                  {isCollapsed ? (
                    <>
                      <ChevronDown className="mr-2 h-4 w-4" />
                      Show all {lineCount} lines
                    </>
                  ) : (
                    <>
                      <ChevronUp className="mr-2 h-4 w-4" />
                      Collapse
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            )}
          </Collapsible>
        )}

        {/* No output state */}
        {!hasOutput && (
          <div className="bg-zinc-900 px-4 py-3 text-sm text-zinc-500 italic">
            No output
          </div>
        )}
      </div>

      {/* Footer actions */}
      {normalizedFooterActions && (
        <div className="@container/actions">
          <ActionButtons
            actions={normalizedFooterActions.items}
            align={normalizedFooterActions.align}
            confirmTimeout={normalizedFooterActions.confirmTimeout}
            onAction={(actionId) => onFooterAction?.(actionId)}
            onBeforeAction={onBeforeFooterAction}
          />
        </div>
      )}
    </div>
  );
}

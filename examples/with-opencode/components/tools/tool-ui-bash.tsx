"use client";

import { memo, useState } from "react";
import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { ChevronRightIcon, DollarSignIcon, XCircleIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  ToolStatusIcon,
  isCancelledToolStatus,
  truncate,
} from "@/components/tools/tool-ui-shared";

const parseResult = (result: unknown) => {
  if (!result) return {};
  if (typeof result === "string") {
    try {
      const parsed = JSON.parse(result);
      if (typeof parsed === "object" && parsed !== null) return parsed;
    } catch {
      // plain text output
    }
    return { stdout: result };
  }
  if (typeof result === "object") return result as Record<string, unknown>;
  return {};
};

export const BashTerminal: ToolCallMessagePartComponent = memo(
  ({ args, result, status }) => {
    const [open, setOpen] = useState(false);

    const command = typeof args?.command === "string" ? args.command : "";
    const description =
      typeof args?.description === "string" ? args.description : "";
    const isRunning = status?.type === "running";
    const isCancelled = isCancelledToolStatus(status);

    const parsed = isRunning ? {} : parseResult(result);
    const stdout =
      typeof parsed.stdout === "string" ? parsed.stdout : undefined;
    const stderr =
      typeof parsed.stderr === "string" ? parsed.stderr : undefined;
    const exitCode = typeof parsed.exitCode === "number" ? parsed.exitCode : 0;
    const hasOutput = Boolean(stdout || stderr);
    const isError = !isRunning && exitCode !== 0;

    const summaryText = description || truncate(command);

    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="group text-muted-foreground hover:text-foreground flex w-full items-center gap-2 py-0.5 text-sm transition-colors"
          >
            {isRunning ? (
              <ToolStatusIcon status={status} />
            ) : isError ? (
              <XCircleIcon className="text-destructive size-3 shrink-0" />
            ) : (
              <ToolStatusIcon
                status={status}
                completeIcon={<DollarSignIcon className="size-3.5 shrink-0" />}
              />
            )}

            <span
              className={cn(
                "flex items-center gap-1.5 truncate",
                isCancelled && "line-through opacity-50",
              )}
            >
              <span className="font-medium">bash</span>
              {summaryText && <span className="opacity-60">{summaryText}</span>}
            </span>

            {hasOutput && (
              <>
                <span className="border-muted-foreground/20 group-hover:border-muted-foreground/50 mt-0.5 min-w-4 flex-1 self-center border-b-[0.5px] transition-colors" />
                <ChevronRightIcon
                  className={cn(
                    "stroke-muted-foreground/60 group-hover:stroke-foreground/60 mt-0.5 size-3.75 shrink-0 transition-[transform,stroke]",
                    open && "rotate-90",
                  )}
                />
              </>
            )}
          </button>
        </CollapsibleTrigger>

        {hasOutput && (
          <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden data-[state=closed]:ease-out data-[state=open]:ease-in">
            <div className="bg-muted/50 mt-1 ml-5 max-h-96 overflow-y-auto rounded-md border p-3 font-mono text-xs">
              {command && (
                <div className="text-muted-foreground mb-2">$ {command}</div>
              )}
              {stdout && (
                <pre className="text-foreground wrap-break-word whitespace-pre-wrap">
                  {stdout}
                </pre>
              )}
              {stderr && (
                <pre
                  className={cn(
                    "text-destructive wrap-break-word whitespace-pre-wrap",
                    stdout && "mt-2",
                  )}
                >
                  {stderr}
                </pre>
              )}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    );
  },
);
BashTerminal.displayName = "BashTerminal";

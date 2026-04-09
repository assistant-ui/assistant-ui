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
            className="group flex w-full items-center gap-2 py-0.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            {isRunning ? (
              <ToolStatusIcon status={status} />
            ) : isError ? (
              <XCircleIcon className="size-3 shrink-0 text-destructive" />
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
                <span className="mt-0.5 min-w-4 flex-1 self-center border-muted-foreground/20 border-b-[0.5px] transition-colors group-hover:border-muted-foreground/50" />
                <ChevronRightIcon
                  className={cn(
                    "mt-0.5 size-3.75 shrink-0 stroke-muted-foreground/60 transition-[transform,stroke] group-hover:stroke-foreground/60",
                    open && "rotate-90",
                  )}
                />
              </>
            )}
          </button>
        </CollapsibleTrigger>

        {hasOutput && (
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down data-[state=closed]:ease-out data-[state=open]:ease-in">
            <div className="mt-1 ml-5 max-h-96 overflow-y-auto rounded-md border bg-muted/50 p-3 font-mono text-xs">
              {command && (
                <div className="mb-2 text-muted-foreground">$ {command}</div>
              )}
              {stdout && (
                <pre className="wrap-break-word whitespace-pre-wrap text-foreground">
                  {stdout}
                </pre>
              )}
              {stderr && (
                <pre
                  className={cn(
                    "wrap-break-word whitespace-pre-wrap text-destructive",
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

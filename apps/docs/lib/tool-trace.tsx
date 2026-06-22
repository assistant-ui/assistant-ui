"use client";

import { cn } from "@/lib/utils";
import { useScrollLock } from "@assistant-ui/react";
import { AlertCircle, ChevronRight } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const TRACE_ANIMATION_DURATION = 200;

/** Renders a tool call as a readable signature, e.g. `get_weather({ location: "SF" })`. */
export function formatToolCall(
  toolName: string,
  args: Record<string, unknown> | undefined,
): string {
  const entries = Object.entries(args ?? {});
  if (entries.length === 0) return `${toolName}()`;
  const body = entries
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join(", ");
  return `${toolName}({ ${body} })`;
}

export function ToolTraceCard({
  icon,
  signature,
  description,
  args,
  result,
}: {
  icon: ReactNode;
  signature: string;
  description: ReactNode;
  args?: Record<string, unknown>;
  result: unknown;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const lockScroll = useScrollLock(rootRef, TRACE_ANIMATION_DURATION);
  const hasArgs = !!args && Object.keys(args).length > 0;

  return (
    <Collapsible
      ref={rootRef}
      open={open}
      onOpenChange={(next) => {
        lockScroll();
        setOpen(next);
      }}
      className="group/tool-trace max-w-full"
      style={
        {
          "--animation-duration": `${TRACE_ANIMATION_DURATION}ms`,
        } as React.CSSProperties
      }
    >
      <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-fit max-w-full cursor-pointer items-center gap-2 py-0.5 transition-colors select-none">
        <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-3.5">
          {icon}
        </span>
        <span className="min-w-0 truncate font-mono text-[13px]">
          {signature}
        </span>
        <span className="text-muted-foreground/60 truncate text-xs">
          {description}
        </span>
        <ChevronRight className="size-3.5 shrink-0 transition-transform group-data-[state=open]/tool-trace:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          "relative overflow-hidden outline-none",
          "data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down ease-out",
          "data-[state=closed]:fill-mode-forwards data-[state=closed]:pointer-events-none",
          "data-[state=closed]:duration-(--animation-duration) data-[state=open]:duration-(--animation-duration)",
        )}
      >
        <div className="my-1 ml-6 space-y-2">
          <div className="space-y-1">
            <p className="text-muted-foreground/60 text-[10px] font-medium tracking-wide uppercase">
              Parameters
            </p>
            <pre className="text-muted-foreground bg-muted/50 max-h-60 overflow-auto rounded-md p-2.5 text-[11px] leading-relaxed">
              {hasArgs ? JSON.stringify(args, null, 2) : "{}"}
            </pre>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground/60 text-[10px] font-medium tracking-wide uppercase">
              Result
            </p>
            <pre className="text-muted-foreground bg-muted/50 max-h-60 overflow-auto rounded-md p-2.5 text-[11px] leading-relaxed">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ToolStatusCard({
  icon,
  signature,
  message,
  loading = false,
}: {
  icon: ReactNode;
  signature: string;
  message: string;
  loading?: boolean;
}) {
  return (
    <div className="text-muted-foreground flex max-w-full items-center gap-2 py-0.5">
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center [&_svg]:size-3.5",
          loading && "animate-pulse",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 truncate font-mono text-[13px]">
        {signature}
      </span>
      <span className="text-muted-foreground/60 truncate text-xs">
        {message}
      </span>
    </div>
  );
}

export function ToolErrorCard({
  signature,
  error,
  args,
}: {
  signature: string;
  error?: string;
  args?: Record<string, unknown>;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const lockScroll = useScrollLock(rootRef, TRACE_ANIMATION_DURATION);
  const message = error || "Unknown error";
  const hasArgs = !!args && Object.keys(args).length > 0;

  return (
    <Collapsible
      ref={rootRef}
      open={open}
      onOpenChange={(next) => {
        lockScroll();
        setOpen(next);
      }}
      className="group/tool-error max-w-full"
      style={
        {
          "--animation-duration": `${TRACE_ANIMATION_DURATION}ms`,
        } as React.CSSProperties
      }
    >
      <CollapsibleTrigger className="text-destructive hover:text-destructive/80 flex w-fit max-w-full cursor-pointer items-center gap-2 py-0.5 text-left transition-colors select-none">
        <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-3.5">
          <AlertCircle />
        </span>
        <span className="min-w-0 truncate font-mono text-[13px]">
          {signature}
        </span>
        <ChevronRight className="size-3.5 shrink-0 transition-transform group-data-[state=open]/tool-error:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          "relative overflow-hidden outline-none",
          "data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down ease-out",
          "data-[state=closed]:fill-mode-forwards data-[state=closed]:pointer-events-none",
          "data-[state=closed]:duration-(--animation-duration) data-[state=open]:duration-(--animation-duration)",
        )}
      >
        <div className="my-1 ml-6 space-y-2">
          <div className="space-y-1">
            <p className="text-muted-foreground/60 text-[10px] font-medium tracking-wide uppercase">
              Parameters
            </p>
            <pre className="text-muted-foreground bg-muted/50 max-h-60 overflow-auto rounded-md p-2.5 text-[11px] leading-relaxed">
              {hasArgs ? JSON.stringify(args, null, 2) : "{}"}
            </pre>
          </div>
          <div className="bg-destructive/20 rounded-md p-2.5">
            <p className="text-destructive text-xs leading-relaxed break-words">
              {message}
            </p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

"use client";

import type { ComponentProps } from "react";
import { ChevronRightIcon, PlugIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, mono, paper } from "./surfaces";

export type McpServerStatus =
  | "connected"
  | "connecting"
  | "needs-auth"
  | "failed";

export interface McpServer {
  id: string;
  name: string;
  transport: string;
  status: McpServerStatus;
  tools: readonly string[];
}

const DOT: Record<McpServerStatus, string> = {
  connected: "bg-emerald-500",
  connecting: "bg-foreground/30 animate-pulse",
  "needs-auth": "bg-amber-500",
  failed: "bg-red-500",
};

const LABEL: Record<McpServerStatus, string> = {
  connected: "connected",
  connecting: "connecting",
  "needs-auth": "needs auth",
  failed: "failed",
};

export function McpServerPanel({
  servers,
  expandedId,
  onToggle,
  onAuthorize,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "servers" | "expandedId" | "onToggle" | "onAuthorize"
> & {
  servers: readonly McpServer[];
  expandedId?: string;
  onToggle?: (id: string) => void;
  onAuthorize?: (id: string) => void;
}) {
  const connected = servers.filter(
    (server) => server.status === "connected",
  ).length;

  return (
    <div
      data-slot="mcp-server-panel"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-1 rounded-2xl p-3",
        className,
      )}

      {...props}
    >
      <div className="flex items-baseline justify-between px-1 pb-1">
        <span className="text-[13.5px] font-medium">Servers</span>
        <span className={cn(mono, "text-foreground/35 tabular-nums")}>
          {connected} of {servers.length} connected
        </span>
      </div>

      {servers.map((server) => {
        const expanded = expandedId === server.id;
        return (
          <div key={server.id} className="flex flex-col">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => onToggle?.(server.id)}
              className="hover:bg-foreground/[0.04] flex items-center gap-2.5 rounded-xl px-1.5 py-2 text-start transition-colors"
            >
              <ChevronRightIcon
                className={cn(
                  "text-foreground/25 size-3 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
                  expanded && "rotate-90",
                )}
              />
              <PlugIcon className="text-foreground/35 size-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-[13.5px]">
                {server.name}
              </span>
              <span className={cn(mono, "text-foreground/30 shrink-0")}>
                {server.tools.length} tools
              </span>
              <span
                aria-hidden
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  DOT[server.status],
                )}
              />
              <span className="sr-only">{LABEL[server.status]}</span>
            </button>

            {expanded && (
              <div className="fade-in slide-in-from-top-1 animate-in flex flex-col gap-1.5 px-1.5 ps-8 pb-2 duration-200">
                <div className="flex items-center gap-2">
                  <span className={cn(mono, "text-foreground/30")}>
                    {server.transport}
                  </span>
                  <span className={cn(mono, "text-foreground/30")}>
                    · {LABEL[server.status]}
                  </span>
                  {server.status === "needs-auth" && onAuthorize && (
                    <button
                      type="button"
                      onClick={() => onAuthorize?.(server.id)}
                      className="ms-auto rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 transition-[background-color,scale] duration-150 hover:bg-amber-500/25 active:scale-[0.96] dark:text-amber-300"
                    >
                      Authorize
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {server.tools.map((tool) => (
                    <span
                      key={tool}
                      className={cn(
                        field,
                        mono,
                        "text-foreground/55 rounded-md px-1.5 py-0.5",
                      )}
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

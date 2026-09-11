"use client";

import type { ComponentProps } from "react";
import { ArrowRightIcon, BotIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, mono } from "./surfaces";

export function AgentHandoff({
  from,
  to,
  reason,
  carried,
  settled,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "from" | "to" | "reason" | "carried" | "settled"
> & {
  from: string;
  to: string;
  reason: string;
  carried: readonly string[];
  settled: boolean;
}) {
  return (
    <div
      data-slot="agent-handoff"
      className={cn("flex w-full max-w-sm flex-col gap-2", className)}

      {...props}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            field,
            "text-foreground/45 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-opacity duration-500",
            settled && "opacity-45",
          )}
        >
          <BotIcon className="size-3" />
          {from}
        </span>

        <ArrowRightIcon
          className={cn(
            "size-3.5 shrink-0 transition-colors duration-500",
            settled ? "text-foreground/25" : "text-blue-500 dark:text-blue-400",
          )}
        />

        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors duration-500",
            settled
              ? cn(field, "text-foreground/80")
              : "bg-blue-500/12 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300",
          )}
        >
          <BotIcon className="size-3" />
          {to}
        </span>
      </div>

      <p className="text-foreground/55 text-xs leading-relaxed">{reason}</p>

      {carried.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className={cn(mono, "text-foreground/30")}>carried over</span>
          {carried.map((item) => (
            <span
              key={item}
              className="text-foreground/60 border-foreground/12 border-s ps-2.5 text-xs leading-relaxed"
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

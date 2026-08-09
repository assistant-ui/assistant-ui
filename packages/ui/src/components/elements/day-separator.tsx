"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { mono } from "./surfaces";

export interface DatedMessage {
  id: string;
  day: string;
  time: string;
  role: "user" | "assistant";
  text: string;
}

export function DaySeparator({
  messages,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children" | "messages"> & {
  messages: readonly DatedMessage[];
}) {
  let lastDay = "";

  return (
    <div
      data-slot="day-separator"
      className={cn("flex w-full max-w-sm flex-col gap-2", className)}

      {...props}
    >
      {messages.map((message) => {
        const newDay = message.day !== lastDay;
        lastDay = message.day;

        return (
          <div key={message.id} className="flex flex-col gap-2">
            {newDay && (
              <div className="flex items-center gap-2.5 py-1">
                <span className="bg-foreground/[0.08] h-px flex-1" />
                <span className={cn(mono, "text-foreground/30")}>
                  {message.day}
                </span>
                <span className="bg-foreground/[0.08] h-px flex-1" />
              </div>
            )}
            <div
              className={cn(
                "group flex items-baseline gap-2",
                message.role === "user" && "flex-row-reverse",
              )}
            >
              <span
                className={cn(
                  "max-w-[80%] text-[13.5px] leading-relaxed",
                  message.role === "user"
                    ? "bg-foreground/[0.05] rounded-2xl px-3.5 py-2"
                    : "text-foreground/75",
                )}
              >
                {message.text}
              </span>
              <span
                className={cn(
                  mono,
                  "text-foreground/0 group-hover:text-foreground/30 shrink-0 tabular-nums transition-colors",
                )}
              >
                {message.time}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

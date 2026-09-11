"use client";

import type { ComponentProps } from "react";
import { LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { inkButton, mono, paper } from "./surfaces";

export interface SharedTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
}

export function SharedConversation({
  title,
  sharedBy,
  sharedAt,
  turns,
  onContinue,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "title" | "sharedBy" | "sharedAt" | "turns" | "onContinue"
> & {
  title: string;
  sharedBy: string;
  sharedAt: string;
  turns: readonly SharedTurn[];
  onContinue?: () => void;
}) {
  return (
    <div
      data-slot="shared-conversation"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col overflow-hidden rounded-2xl",
        className,
      )}

      {...props}
    >
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-3">
        <LinkIcon className="text-foreground/30 size-3.5 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13.5px] font-medium">{title}</span>
          <span className={cn(mono, "text-foreground/30 truncate")}>
            shared by {sharedBy} · {sharedAt}
          </span>
        </div>
      </div>

      <div className="border-foreground/[0.07] flex flex-col gap-2.5 border-t px-4 py-3.5">
        {turns.map((turn) => (
          <div
            key={turn.id}
            className={cn(
              "text-[13px] leading-relaxed",
              turn.role === "user"
                ? "bg-foreground/[0.05] ms-auto max-w-[85%] rounded-2xl px-3 py-2"
                : "text-foreground/70",
            )}
          >
            {turn.text}
          </div>
        ))}
      </div>

      <div className="border-foreground/[0.07] flex items-center gap-2 border-t px-4 py-3">
        <span className={cn(mono, "text-foreground/30")}>read only</span>
        <button
          type="button"
          onClick={onContinue}
          className={cn(
            inkButton,
            "ms-auto flex h-8 items-center rounded-full px-3.5 text-xs font-medium",
          )}
        >
          Continue in your own chat
        </button>
      </div>
    </div>
  );
}

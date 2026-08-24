"use client";

import type { ComponentProps } from "react";
import { MessageCircleIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, floating, inkButton, mono } from "./surfaces";

export function LauncherBubble({
  open,
  unread,
  greeting,
  prompts,
  onToggle,
  onPick,
  onStart,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "open"
  | "unread"
  | "greeting"
  | "prompts"
  | "onToggle"
  | "onPick"
  | "onStart"
> & {
  open: boolean;
  unread: number;
  greeting: string;
  prompts: readonly string[];
  onToggle?: () => void;
  onPick?: (prompt: string) => void;
  onStart?: () => void;
}) {
  return (
    <div
      data-slot="launcher-bubble"
      className={cn(
        "flex w-full max-w-[19rem] flex-col items-end gap-2.5",
        className,
      )}

      {...props}
    >
      {open && (
        <div
          className={cn(
            floating,
            "fade-in zoom-in-95 slide-in-from-bottom-2 animate-in flex w-full flex-col gap-3 rounded-[20px] p-4 duration-200",
          )}
        >
          <div className="flex flex-col gap-1">
            <span className="text-[13.5px] font-medium">{greeting}</span>
            <span className={cn(mono, "text-foreground/30")}>
              typically replies in a minute
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onPick?.(prompt)}
                className={cn(
                  field,
                  "hover:bg-foreground/[0.07] text-foreground/70 rounded-xl px-3 py-2 text-start text-[13px] transition-colors",
                )}
              >
                {prompt}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onStart}
            className={cn(
              inkButton,
              "flex h-8 items-center justify-center rounded-full text-xs font-medium",
            )}
          >
            Start a conversation
          </button>
        </div>
      )}

      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close the assistant" : "Open the assistant"}
        onClick={onToggle}
        className={cn(
          inkButton,
          "relative flex size-12 shrink-0 items-center justify-center rounded-full",
        )}
      >
        <span className="grid">
          <MessageCircleIcon
            className={cn(
              "size-5 transition-[opacity,rotate] duration-200 [grid-area:1/1]",
              open && "rotate-90 opacity-0",
            )}
          />
          <XIcon
            className={cn(
              "size-5 transition-[opacity,rotate] duration-200 [grid-area:1/1]",
              !open && "-rotate-90 opacity-0",
            )}
          />
        </span>

        {unread > 0 && !open && (
          <span
            className={cn(
              mono,
              "bg-background text-foreground absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full tabular-nums",
            )}
          >
            {unread}
          </span>
        )}
      </button>
    </div>
  );
}

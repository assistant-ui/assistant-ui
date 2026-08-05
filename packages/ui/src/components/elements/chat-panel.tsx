"use client";

import { ArrowUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, inkButton, paper } from "./surfaces";

export interface ChatPanelProps {
  userMessage: string;
  reply: string;
  showUserMessage: boolean;
  typing: boolean;
  visibleWords: number;
  streaming: boolean;
  className?: string;
}

export function ChatPanel({
  userMessage,
  reply,
  showUserMessage,
  typing,
  visibleWords,
  streaming,
  className,
}: ChatPanelProps) {
  const words = reply.split(" ");

  return (
    <div
      className={cn(
        paper,
        "flex h-[270px] w-full max-w-md flex-col overflow-hidden rounded-[24px]",
        className,
      )}
    >
      <div className="flex flex-1 flex-col justify-end gap-2.5 overflow-hidden p-4">
        {showUserMessage && (
          <div
            className={cn(
              field,
              "fade-in slide-in-from-bottom-1 animate-in self-end rounded-2xl px-3 py-1.5 text-xs duration-300",
            )}
          >
            {userMessage}
          </div>
        )}
        {typing && (
          <div className="fade-in animate-in flex gap-1 self-start px-1 duration-300">
            {["-0.32s", "-0.16s", "0s"].map((delay) => (
              <span
                key={delay}
                aria-hidden
                className="bg-foreground/40 size-1 animate-bounce rounded-full motion-reduce:animate-none"
                style={{ animationDelay: delay, animationDuration: "1.1s" }}
              />
            ))}
          </div>
        )}
        {visibleWords > 0 && (
          <p className="text-foreground/70 max-w-[85%] self-start text-xs leading-relaxed">
            {words.slice(0, visibleWords).map((word, i) => {
              const fresh = streaming && visibleWords - 1 - i < 2;
              return (
                <span
                  key={i}
                  className="fade-in animate-in fill-mode-both duration-500 motion-reduce:animate-none"
                >
                  <span
                    className={cn(
                      "transition-colors duration-700 motion-reduce:transition-none",
                      fresh && "text-blue-500 dark:text-blue-400",
                    )}
                  >
                    {word}
                  </span>{" "}
                </span>
              );
            })}
            {streaming && (
              <span
                aria-hidden
                className="-mb-0.5 ml-0.5 inline-block h-3 w-0.5 animate-pulse rounded-full bg-blue-500 dark:bg-blue-400"
              />
            )}
          </p>
        )}
      </div>
      <div
        className={cn(
          field,
          "mx-3 mb-3 flex h-10 shrink-0 items-center justify-between rounded-full py-1.5 ps-4 pe-1.5",
        )}
      >
        <span className="text-foreground/35 text-[13px]">Message</span>
        <span
          className={cn(
            inkButton,
            "flex size-7 items-center justify-center rounded-full",
          )}
        >
          <ArrowUpIcon className="size-3.5" />
        </span>
      </div>
    </div>
  );
}

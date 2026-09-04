"use client";

import { AuiIf, ThreadPrimitive, useAuiState } from "@assistant-ui/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  { label: "Weather in Tokyo", prompt: "What's the weather in Tokyo?" },
  {
    label: "Show a sales dashboard",
    prompt:
      "Use the present tool to show a compact sales dashboard: a Card with two Facts in a Row and a bar Chart of monthly sales.",
  },
  {
    label: "Switch to dark mode",
    prompt: "Switch this page to dark mode.",
  },
  {
    label: "Derive the geometric series",
    prompt: "Derive the closed form of the geometric series, step by step.",
  },
  {
    label: "Diagram a streaming chat app",
    prompt:
      "Draw the request flow of a streaming chat app as a mermaid sequence diagram, then explain it briefly.",
  },
  {
    label: "Add a thread list",
    prompt: "How do I add a thread list to an assistant-ui app?",
  },
  {
    label: "Remember my stack",
    prompt:
      "Remember that I build with Next.js and prefer TypeScript examples.",
  },
];

const suggestionChipClass =
  "border-foreground/10 bg-background text-muted-foreground hover:border-foreground/25 hover:text-foreground rounded-control h-8 border px-3 text-[13px] transition-colors";

export function Suggestions(): ReactNode {
  return (
    <div className="animate-in fade-in mx-auto flex max-w-[34rem] flex-wrap items-center justify-center gap-2 duration-200 motion-reduce:animate-none">
      {SUGGESTIONS.map((suggestion) => (
        <ThreadPrimitive.Suggestion
          key={suggestion.prompt}
          prompt={suggestion.prompt}
          send
          className={suggestionChipClass}
        >
          {suggestion.label}
        </ThreadPrimitive.Suggestion>
      ))}
    </div>
  );
}

export function FollowUps(): ReactNode {
  const suggestions = useAuiState((s) => s.thread.suggestions);

  return (
    <AuiIf
      condition={(s) =>
        !s.thread.isEmpty &&
        !s.thread.isRunning &&
        s.thread.suggestions.length > 0
      }
    >
      <div className="animate-in fade-in flex [scrollbar-width:none] gap-2 overflow-x-auto duration-200 motion-reduce:animate-none [&::-webkit-scrollbar]:hidden">
        {suggestions.map((suggestion) => (
          <ThreadPrimitive.Suggestion
            key={suggestion.prompt}
            prompt={suggestion.prompt}
            send
            className={cn(suggestionChipClass, "shrink-0 whitespace-nowrap")}
          >
            {suggestion.prompt}
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </AuiIf>
  );
}

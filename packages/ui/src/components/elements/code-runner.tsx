"use client";

import type { ComponentProps } from "react";
import { Loader2Icon, PlayIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { codeScroll, codeSurface, ghostButton, mono, paper } from "./surfaces";

export type RunState = "idle" | "running" | "ok" | "error";

export function CodeRunner({
  language,
  code,
  state,
  output,
  durationMs,
  onRun,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "language" | "code" | "state" | "output" | "durationMs" | "onRun"
> & {
  language: string;
  code: string;
  state: RunState;
  output: readonly string[];
  durationMs?: number;
  onRun?: () => void;
}) {
  return (
    <div
      data-slot="code-runner"
      className={cn(
        paper,
        "flex w-full max-w-md flex-col overflow-hidden rounded-2xl",
        className,
      )}

      {...props}
    >
      <div className="flex items-center gap-2 px-3.5 py-2">
        <span className={cn(mono, "text-foreground/35 min-w-0 flex-1")}>
          {language}
        </span>
        {durationMs !== undefined && state !== "running" && (
          <span
            className={cn(mono, "text-foreground/30 shrink-0 tabular-nums")}
          >
            {durationMs}ms
          </span>
        )}
        <button
          type="button"
          aria-label="Run this snippet"
          onClick={onRun}
          disabled={state === "running"}
          className={cn(
            ghostButton,
            "size-7 shrink-0 disabled:pointer-events-none",
          )}
        >
          {state === "running" ? (
            <Loader2Icon className="size-3.5 animate-spin motion-reduce:animate-none" />
          ) : (
            <PlayIcon className="size-3.5 translate-x-px" />
          )}
        </button>
      </div>

      <pre className="border-foreground/[0.07] overflow-x-auto border-t px-3.5 py-2.5 font-mono text-xs leading-relaxed">
        <code className="text-foreground/75">{code}</code>
      </pre>

      {state !== "idle" && (
        <div className="border-foreground/[0.07] fade-in animate-in flex flex-col border-t px-3.5 py-2.5 duration-300">
          <span className={cn(mono, "text-foreground/30 pb-1")}>output</span>
          <div className={codeScroll}>
            <div className={cn(codeSurface, "flex flex-col")}>
              {output.map((line, i) => (
                <span
                  key={`${i}-${line}`}
                  className={cn(
                    "fade-in animate-in fill-mode-both font-mono text-xs leading-relaxed whitespace-pre",
                    state === "error"
                      ? "text-red-600 dark:text-red-400"
                      : "text-foreground/70",
                  )}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {line}
                </span>
              ))}
            </div>
          </div>
          {state === "running" && (
            <span
              aria-hidden
              className="bg-foreground/40 h-[1em] w-[2px] animate-pulse rounded-full motion-reduce:animate-none"
            />
          )}
        </div>
      )}
    </div>
  );
}

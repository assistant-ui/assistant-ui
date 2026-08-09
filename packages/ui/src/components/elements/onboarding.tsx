"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { field, inkButton, mono, paper } from "./surfaces";

export interface OnboardingStep {
  title: string;
  body: string;
  example: string;
}

export function Onboarding({
  steps,
  index,
  onNext,
  onSkip,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "steps" | "index" | "onNext" | "onSkip"
> & {
  steps: readonly OnboardingStep[];
  index: number;
  onNext?: () => void;
  onSkip?: () => void;
}) {
  const step = steps[Math.min(index, steps.length - 1)];
  if (!step) return null;
  const last = index >= steps.length - 1;

  return (
    <div
      data-slot="onboarding"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-4 rounded-[20px] p-5",
        className,
      )}

      {...props}
    >
      <div
        key={index}
        className="fade-in animate-in flex flex-col gap-2 duration-300"
      >
        <span className={cn(mono, "text-foreground/30 tabular-nums")}>
          {index + 1} of {steps.length}
        </span>
        <span className="text-[15px] font-medium tracking-tight">
          {step.title}
        </span>
        <p className="text-foreground/55 text-[13px] leading-relaxed">
          {step.body}
        </p>
        <span
          className={cn(
            field,
            "text-foreground/60 rounded-xl px-3 py-2 text-[13px] leading-relaxed",
          )}
        >
          {step.example}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="flex gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              aria-hidden
              className={cn(
                "h-1 rounded-full transition-all duration-300 motion-reduce:transition-none",
                i === index ? "bg-foreground/60 w-4" : "bg-foreground/15 w-1",
              )}
            />
          ))}
        </span>

        <button
          type="button"
          onClick={onSkip}
          className="text-foreground/45 hover:bg-foreground/[0.06] hover:text-foreground/90 ms-auto h-8 rounded-full px-3 text-xs font-medium transition-[background-color,color,scale] duration-150 active:scale-[0.96]"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={onNext}
          className={cn(
            inkButton,
            "flex h-8 items-center rounded-full px-3.5 text-xs font-medium",
          )}
        >
          {last ? "Start" : "Next"}
        </button>
      </div>
    </div>
  );
}

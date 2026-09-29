"use client";

import type { ComponentProps } from "react";
import type { ReactNode } from "react";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { inkButton, mono, paper } from "./surfaces";

export type RecommendationState = "idle" | "accepted";

const CONFIDENCE_BARS = [0, 1, 2];

export function RecommendationCard({
  state,
  question,
  children,
  confidenceLabel,
  acceptedLabel,
  onAccept,
  onAlternatives,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "state"
  | "question"
  | "children"
  | "confidenceLabel"
  | "acceptedLabel"
  | "onAccept"
  | "onAlternatives"
> & {
  state: RecommendationState;
  question: string;
  children: ReactNode;
  confidenceLabel: string;
  acceptedLabel: string;
  onAccept?: () => void;
  onAlternatives?: () => void;
}) {
  return (
    <div
      data-slot="recommendation-card"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-3 rounded-[20px] p-4",
        className,
      )}

      {...props}
    >
      <p className="text-sm font-medium">{question}</p>
      <p className="text-foreground/55 text-[13px] leading-relaxed">
        {children}
      </p>

      <div className="flex h-8 items-center justify-between">
        {state === "idle" ? (
          <>
            <div className="flex items-center gap-2">
              <span className="flex items-end gap-0.5" aria-hidden>
                {CONFIDENCE_BARS.map((bar) => (
                  <span
                    key={bar}
                    className="w-1 rounded-full bg-emerald-500/70"
                    style={{ height: 6 + bar * 3 }}
                  />
                ))}
              </span>
              <span className={cn(mono, "text-foreground/40")}>
                {confidenceLabel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onAlternatives}
                className="text-foreground/55 hover:bg-foreground/[0.06] hover:text-foreground/90 h-8 rounded-full px-3.5 text-xs font-medium transition-[background-color,color,scale] duration-150 active:scale-[0.96]"
              >
                Alternatives
              </button>
              <button
                type="button"
                onClick={onAccept}
                className={cn(
                  inkButton,
                  "flex h-8 items-center rounded-full px-3.5 text-xs font-medium",
                )}
              >
                Accept
              </button>
            </div>
          </>
        ) : (
          <div
            key="accepted"
            className="fade-in animate-in text-foreground/55 flex items-center gap-2 text-xs duration-300"
          >
            <CheckIcon className="size-3.5 text-emerald-500" />
            {acceptedLabel}
          </div>
        )}
      </div>
    </div>
  );
}

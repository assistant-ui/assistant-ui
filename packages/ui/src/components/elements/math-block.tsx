"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";

export interface MathStep {
  expression: React.ReactNode;
  note?: string;
}

export function MathBlock({
  label,
  steps,
  visibleSteps,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "label" | "steps" | "visibleSteps"
> & {
  label?: string;
  steps: readonly MathStep[];
  visibleSteps: number;
}) {
  return (
    <div
      data-slot="math-block"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-2.5 rounded-2xl p-4",
        className,
      )}

      {...props}
    >
      {label && <span className={cn(mono, "text-foreground/30")}>{label}</span>}

      {steps.slice(0, visibleSteps).map((step, i) => (
        <div
          key={i}
          className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both flex flex-col gap-1 duration-300"
        >
          <span className="text-foreground/90 overflow-x-auto py-1 text-center font-serif text-[17px] leading-relaxed italic">
            {step.expression}
          </span>
          {step.note && (
            <span className={cn(mono, "text-foreground/30 text-center")}>
              {step.note}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function Frac({
  over,
  under,
}: {
  over: React.ReactNode;
  under: React.ReactNode;
}) {
  return (
    <span
      data-slot="frac"
      className="inline-flex flex-col items-center align-middle text-[0.85em] leading-tight"
    >
      <span className="px-1">{over}</span>
      <span className="border-foreground/40 w-full border-t px-1">{under}</span>
    </span>
  );
}

export function Sup({ children }: { children: React.ReactNode }) {
  return <sup className="text-[0.65em] not-italic">{children}</sup>;
}

export function Sub({ children }: { children: React.ReactNode }) {
  return <sub className="text-[0.65em] not-italic">{children}</sub>;
}

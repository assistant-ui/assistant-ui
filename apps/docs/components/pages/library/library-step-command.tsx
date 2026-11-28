"use client";

import { useState } from "react";
import type { LibraryCommandStep } from "@/lib/library/library-data";
import { cn } from "@/lib/utils";
import { LibraryCopyButton } from "./library-copy-button";
import { LibraryTooltip } from "./library-tooltip";

/**
 * An install command that steps: `base` stays put and a click swaps what
 * follows it for the next step. The copy button copies the command as shown.
 */
export function LibraryStepCommand({
  base,
  steps,
  className,
}: {
  base: string;
  steps: readonly LibraryCommandStep[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const step = steps[index % steps.length];
  if (!step) return null;
  const text = step.rest ? `${base} ${step.rest}` : base;
  const more = steps.length > 1;

  return (
    <div
      className={cn(
        "border-foreground/10 bg-background relative flex h-9 w-full max-w-md min-w-0 items-center rounded-full border ps-4 pe-1",
        className,
      )}
    >
      <code className="flex min-w-0 flex-1 items-center overflow-hidden font-mono text-[13px] whitespace-nowrap [font-variant-ligatures:none]">
        <span aria-hidden className="text-muted-foreground me-2">
          $
        </span>
        <span className="shrink-0">{base}</span>
        <span
          key={step.rest}
          className="animate-in fade-in-0 slide-in-from-bottom-1 ms-[1ch] truncate duration-200 motion-reduce:animate-none"
        >
          {step.rest}
        </span>
      </code>
      {more ? (
        <LibraryTooltip label={`${step.does}. Click for the next command.`}>
          <button
            type="button"
            aria-label={`${text}: ${step.does}. Show the next command.`}
            onClick={() => setIndex((current) => (current + 1) % steps.length)}
            className="focus-visible:ring-ring absolute inset-0 cursor-pointer rounded-full outline-none focus-visible:ring-2"
          />
        </LibraryTooltip>
      ) : null}
      <LibraryCopyButton
        text={text}
        label="Copy this command"
        className="relative rounded-full"
      />
    </div>
  );
}

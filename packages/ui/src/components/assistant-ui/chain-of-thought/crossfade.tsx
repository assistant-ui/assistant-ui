"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Props for the small value crossfade used by live trigger labels. */
export type CrossfadeProps<T> = {
  value: T;
  children: (value: T) => ReactNode;
  enterDuration?: number | undefined;
  exitDuration?: number | undefined;
  enterDelay?: number | undefined;
  className?: string | undefined;
};

/** Crossfades between rendered values without remounting the surrounding label. */
export function Crossfade<T>({
  value,
  children,
  enterDuration = 300,
  exitDuration = 200,
  enterDelay = 0,
  className,
}: CrossfadeProps<T>) {
  const currentValueRef = useRef(value);
  const generationRef = useRef(0);
  // Wrapped in an object (not `T | null`) so a legitimately null/falsy previous
  // value still drives a crossfade instead of being read as "not transitioning".
  const previousEntryRef = useRef<{ value: T; generation: number } | null>(
    null,
  );
  const [settledGeneration, setSettledGeneration] = useState(0);
  const durationsRef = useRef({ enterDuration, exitDuration, enterDelay });
  durationsRef.current = { enterDuration, exitDuration, enterDelay };

  if (!Object.is(currentValueRef.current, value)) {
    generationRef.current += 1;
    previousEntryRef.current = {
      value: currentValueRef.current,
      generation: generationRef.current,
    };
    currentValueRef.current = value;
  }

  const previousEntry =
    previousEntryRef.current &&
    previousEntryRef.current.generation > settledGeneration
      ? previousEntryRef.current
      : null;
  const generation = generationRef.current;

  useEffect(() => {
    if (!previousEntry) return undefined;
    const {
      enterDuration: enter,
      exitDuration: exit,
      enterDelay: delay,
    } = durationsRef.current;
    const totalMs = Math.max(exit, delay + enter);
    const timeout = window.setTimeout(() => {
      setSettledGeneration((current) =>
        current >= previousEntry.generation
          ? current
          : previousEntry.generation,
      );
    }, totalMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [previousEntry]);

  const isTransitioning = previousEntry !== null;

  return (
    <div
      data-slot="chain-of-thought-crossfade"
      className={cn("relative flex min-w-0", className)}
      style={
        isTransitioning
          ? ({
              "--crossfade-exit-duration": `${exitDuration}ms`,
              "--crossfade-enter-duration": `${enterDuration}ms`,
              "--crossfade-enter-delay": `${enterDelay}ms`,
            } as React.CSSProperties)
          : undefined
      }
    >
      {isTransitioning && (
        <div
          key={`exit-${generation}`}
          aria-hidden
          className={cn(
            "aui-chain-of-thought-crossfade-exit",
            "fade-out-0 pointer-events-none absolute inset-0 w-full min-w-0 animate-out fill-mode-both duration-[var(--crossfade-exit-duration)]",
            "motion-reduce:animate-none motion-reduce:transition-none",
          )}
        >
          {children(previousEntry.value)}
        </div>
      )}
      <div
        key={`enter-${generation}`}
        className={cn(
          "aui-chain-of-thought-crossfade-enter w-fit min-w-0",
          isTransitioning &&
            "fade-in-0 animate-in fill-mode-both delay-[var(--crossfade-enter-delay)] duration-[var(--crossfade-enter-duration)] motion-reduce:animate-none motion-reduce:transition-none",
        )}
      >
        {children(value)}
      </div>
    </div>
  );
}

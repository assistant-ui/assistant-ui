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
  const [currentValue, setCurrentValue] = useState(value);
  // Wrapped in an object (not `T | null`) so a legitimately null/falsy previous
  // value still drives a crossfade instead of being read as "not transitioning".
  const [previousEntry, setPreviousEntry] = useState<{ value: T } | null>(null);
  const [generation, setGeneration] = useState(0);
  const valueRef = useRef(value);
  const cleanupRef = useRef<number | null>(null);
  // Read durations via a ref so they are NOT effect deps. Otherwise a duration
  // prop change mid-fade re-runs the effect, whose cleanup clears the pending
  // reset timer, but the `Object.is` guard then bails before rescheduling it —
  // leaving the exit layer mounted forever.
  const durationsRef = useRef({ enterDuration, exitDuration, enterDelay });
  durationsRef.current = { enterDuration, exitDuration, enterDelay };

  useEffect(() => {
    if (Object.is(valueRef.current, value)) return;

    setPreviousEntry({ value: valueRef.current });
    setCurrentValue(value);
    setGeneration((g) => g + 1);
    valueRef.current = value;

    if (cleanupRef.current !== null) window.clearTimeout(cleanupRef.current);

    const {
      enterDuration: enter,
      exitDuration: exit,
      enterDelay: delay,
    } = durationsRef.current;
    const totalMs = Math.max(exit, delay + enter);
    cleanupRef.current = window.setTimeout(() => {
      setPreviousEntry(null);
      cleanupRef.current = null;
    }, totalMs);

    return () => {
      if (cleanupRef.current !== null) window.clearTimeout(cleanupRef.current);
    };
  }, [value]);

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
        {children(currentValue)}
      </div>
    </div>
  );
}

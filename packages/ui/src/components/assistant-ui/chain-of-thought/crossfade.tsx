"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CrossfadeProps<T> = {
  value: T;
  children: (value: T) => ReactNode;
  enterDuration?: number;
  exitDuration?: number;
  enterDelay?: number;
  className?: string;
};

export function Crossfade<T>({
  value,
  children,
  enterDuration = 300,
  exitDuration = 200,
  enterDelay = 0,
  className,
}: CrossfadeProps<T>) {
  const [currentValue, setCurrentValue] = useState(value);
  const [previousValue, setPreviousValue] = useState<T | null>(null);
  const [generation, setGeneration] = useState(0);
  const valueRef = useRef(value);
  const cleanupRef = useRef<number | null>(null);

  useEffect(() => {
    if (Object.is(valueRef.current, value)) return;

    setPreviousValue(valueRef.current);
    setCurrentValue(value);
    setGeneration((g) => g + 1);
    valueRef.current = value;

    if (cleanupRef.current) window.clearTimeout(cleanupRef.current);

    const totalMs = Math.max(exitDuration, enterDelay + enterDuration);
    cleanupRef.current = window.setTimeout(() => {
      setPreviousValue(null);
      cleanupRef.current = null;
    }, totalMs);

    return () => {
      if (cleanupRef.current) window.clearTimeout(cleanupRef.current);
    };
  }, [value, enterDuration, exitDuration, enterDelay]);

  const isTransitioning = previousValue != null;

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
          )}
        >
          {children(previousValue as T)}
        </div>
      )}
      <div
        key={`enter-${generation}`}
        className={cn(
          "aui-chain-of-thought-crossfade-enter w-fit min-w-0",
          isTransitioning &&
            "fade-in-0 animate-in fill-mode-both delay-[var(--crossfade-enter-delay)] duration-[var(--crossfade-enter-duration)]",
        )}
      >
        {children(currentValue)}
      </div>
    </div>
  );
}

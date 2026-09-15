import { useEffect, useState, type ComponentProps } from "react";

import { Text } from "ink";
import InkSpinner from "ink-spinner";

const LOADING_FRAMES = {
  dots: [".  ", ".. ", "..."],
  pulse: ["*--", "-*-", "--*"],
  bar: ["[=   ]", "[==  ]", "[=== ]", "[ ===]", "[  ==]", "[   =]"],
  bounce: ["[*   ]", "[ *  ]", "[  * ]", "[   *]", "[  * ]", "[ *  ]"],
} as const;

type LoadingSpinnerVariant = "spinner" | keyof typeof LOADING_FRAMES;

/**
 * The runtime clamps a non-positive delay to 1ms, which would redraw the
 * terminal about a thousand times a second for an animation no one can read.
 * One frame at 60fps is the fastest a redraw is worth committing.
 */
const MIN_INTERVAL_MS = 16;

export type LoadingSpinnerProps = Omit<
  ComponentProps<typeof Text>,
  "children"
> & {
  variant?: LoadingSpinnerVariant;
  type?: ComponentProps<typeof InkSpinner>["type"];
  intervalMs?: number;
};

export const LoadingSpinner = ({
  variant = "spinner",
  type = "dots",
  intervalMs = 120,
  ...textProps
}: LoadingSpinnerProps) => {
  const [frameIndex, setFrameIndex] = useState(0);
  const frames = variant === "spinner" ? null : LOADING_FRAMES[variant];
  const frameIntervalMs = Number.isFinite(intervalMs)
    ? Math.max(MIN_INTERVAL_MS, intervalMs)
    : MIN_INTERVAL_MS;

  useEffect(() => {
    if (!frames) return;

    const interval = setInterval(() => {
      setFrameIndex((current) => (current + 1) % frames.length);
    }, frameIntervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [frameIntervalMs, frames]);

  if (frames) {
    return <Text {...textProps}>{frames[frameIndex % frames.length]}</Text>;
  }

  return (
    <Text {...textProps}>
      <InkSpinner type={type} />
    </Text>
  );
};

LoadingSpinner.displayName = "LoadingPrimitive.Spinner";

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

  useEffect(() => {
    if (!frames) return;

    const interval = setInterval(() => {
      setFrameIndex((current) => (current + 1) % frames.length);
    }, intervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [intervalMs, frames]);

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

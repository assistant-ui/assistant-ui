import { useEffect, useState } from "react";
import type { ComponentProps } from "react";
import { Text } from "ink";
import InkSpinner from "ink-spinner";

const LOADING_FRAMES = {
  spinner: [],
  dots: [".  ", ".. ", "..."],
  pulse: ["*--", "-*-", "--*"],
  bar: ["[=   ]", "[==  ]", "[=== ]", "[ ===]", "[  ==]", "[   =]"],
  bounce: ["[*   ]", "[ *  ]", "[  * ]", "[   *]", "[  * ]", "[ *  ]"],
} as const;

export type LoadingSpinnerVariant = keyof typeof LOADING_FRAMES;

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
  color = "yellow",
  intervalMs = 120,
  ...textProps
}: LoadingSpinnerProps) => {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (variant === "spinner") return;

    const interval = setInterval(() => {
      setFrameIndex((current) => current + 1);
    }, intervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [intervalMs, variant]);

  if (variant !== "spinner") {
    const frames = LOADING_FRAMES[variant];
    const frame = frames[frameIndex % frames.length];

    return (
      <Text color={color} {...textProps}>
        {frame}
      </Text>
    );
  }

  return (
    <Text color={color} {...textProps}>
      <InkSpinner type={type} />
    </Text>
  );
};

LoadingSpinner.displayName = "LoadingPrimitive.Spinner";

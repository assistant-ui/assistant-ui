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

export namespace LoadingSpinner {
  export type Variant = keyof typeof LOADING_FRAMES;
  export type Props = {
    variant?: Variant;
    type?: ComponentProps<typeof InkSpinner>["type"];
    color?: ComponentProps<typeof Text>["color"];
    intervalMs?: number;
  };
}

export const LoadingSpinner = ({
  variant = "spinner",
  type = "dots",
  color = "yellow",
  intervalMs = 120,
}: LoadingSpinner.Props) => {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (variant === "spinner") return;

    setFrameIndex(0);

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

    return <Text color={color}>{frame}</Text>;
  }

  return (
    <Text color={color}>
      <InkSpinner type={type} />
    </Text>
  );
};

LoadingSpinner.displayName = "LoadingPrimitive.Spinner";

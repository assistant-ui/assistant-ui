import type { ComponentProps, ReactNode } from "react";
import { Text } from "ink";

export type LoadingTextProps = {
  children?: ReactNode;
  color?: ComponentProps<typeof Text>["color"];
};

export const LoadingText = ({
  children = "Thinking...",
  color = "yellow",
}: LoadingTextProps) => {
  return <Text color={color}>{children}</Text>;
};

LoadingText.displayName = "LoadingPrimitive.Text";

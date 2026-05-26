import type { ComponentProps, ReactNode } from "react";
import { Text } from "ink";

export type LoadingTextProps = ComponentProps<typeof Text> & {
  children?: ReactNode;
};

export const LoadingText = ({
  children = "Thinking...",
  ...textProps
}: LoadingTextProps) => {
  return <Text {...textProps}>{children}</Text>;
};

LoadingText.displayName = "LoadingPrimitive.Text";

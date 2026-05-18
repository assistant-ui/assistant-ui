import type { ComponentProps, ReactNode } from "react";
import { Text } from "ink";

export namespace LoadingText {
  export type Props = {
    children?: ReactNode;
    color?: ComponentProps<typeof Text>["color"];
  };
}

export const LoadingText = ({
  children = "Thinking...",
  color = "yellow",
}: LoadingText.Props) => {
  return <Text color={color}>{children}</Text>;
};

LoadingText.displayName = "LoadingPrimitive.Text";

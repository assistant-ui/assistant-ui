import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

export type ChainOfThoughtRootProps = ViewProps & {
  children: ReactNode;
};

export const ChainOfThoughtRoot = ({
  children,
  ...viewProps
}: ChainOfThoughtRootProps) => {
  return <View {...viewProps}>{children}</View>;
};

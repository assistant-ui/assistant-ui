import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

export type ThreadRootProps = ViewProps & {
  children: ReactNode;
};

export const ThreadRoot = ({ children, ...viewProps }: ThreadRootProps) => {
  return <View {...viewProps}>{children}</View>;
};

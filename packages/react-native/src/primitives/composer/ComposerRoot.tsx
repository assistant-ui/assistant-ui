import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

export type ComposerRootProps = ViewProps & {
  children: ReactNode;
};

export const ComposerRoot = ({ children, ...viewProps }: ComposerRootProps) => {
  return <View {...viewProps}>{children}</View>;
};

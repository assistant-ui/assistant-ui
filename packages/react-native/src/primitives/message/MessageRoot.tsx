import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

export type MessageRootProps = ViewProps & {
  children: ReactNode;
};

export const MessageRoot = ({ children, ...viewProps }: MessageRootProps) => {
  return <View {...viewProps}>{children}</View>;
};

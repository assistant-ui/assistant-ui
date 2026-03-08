import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

export type ThreadListItemRootProps = ViewProps & {
  children: ReactNode;
};

export const ThreadListItemRoot = ({
  children,
  ...viewProps
}: ThreadListItemRootProps) => {
  return <View {...viewProps}>{children}</View>;
};

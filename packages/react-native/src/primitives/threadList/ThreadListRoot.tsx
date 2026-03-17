import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

export type ThreadListRootProps = ViewProps & {
  children: ReactNode;
};

export const ThreadListRoot = ({
  children,
  ...viewProps
}: ThreadListRootProps) => {
  return <View {...viewProps}>{children}</View>;
};

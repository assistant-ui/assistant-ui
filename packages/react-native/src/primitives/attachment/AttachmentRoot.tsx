import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

export type AttachmentRootProps = ViewProps & {
  children: ReactNode;
};

export const AttachmentRoot = ({
  children,
  ...viewProps
}: AttachmentRootProps) => {
  return <View {...viewProps}>{children}</View>;
};

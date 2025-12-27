import { FC, PropsWithChildren } from "react";
import { View, ViewProps } from "react-native";

export type MessageRootProps = PropsWithChildren<ViewProps>;

export const MessageRoot: FC<MessageRootProps> = ({
  children,
  ...viewProps
}) => {
  return <View {...viewProps}>{children}</View>;
};

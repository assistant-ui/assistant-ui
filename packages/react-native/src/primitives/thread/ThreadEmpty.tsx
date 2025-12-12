import { FC, PropsWithChildren } from "react";
import { View, ViewProps } from "react-native";
import { useThread } from "../../hooks/useThread";

export type ThreadEmptyProps = PropsWithChildren<ViewProps>;

export const ThreadEmpty: FC<ThreadEmptyProps> = ({
  children,
  ...viewProps
}) => {
  const isEmpty = useThread((state) => state.isEmpty);
  const isLoading = useThread((state) => state.isLoading);

  if (!isEmpty || isLoading) {
    return null;
  }

  return <View {...viewProps}>{children}</View>;
};

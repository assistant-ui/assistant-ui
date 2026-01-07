import { FC, PropsWithChildren } from "react";
import { View, ViewProps } from "react-native";
import { useThreadList } from "../../hooks/useThreadList";

export type ThreadListEmptyProps = PropsWithChildren<ViewProps>;

export const ThreadListEmpty: FC<ThreadListEmptyProps> = ({
  children,
  ...viewProps
}) => {
  const threads = useThreadList((state) => state.threads);
  const isLoading = useThreadList((state) => state.isLoading);

  if (threads.length > 0 || isLoading) {
    return null;
  }

  return <View {...viewProps}>{children}</View>;
};

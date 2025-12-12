import { FC, PropsWithChildren } from "react";
import { View, ViewProps } from "react-native";
import { ThreadListProvider } from "../../context/ThreadListContext";
import type { ThreadListRuntime } from "../../runtime/types";

export type ThreadListRootProps = PropsWithChildren<
  ViewProps & {
    runtime: ThreadListRuntime;
  }
>;

export const ThreadListRoot: FC<ThreadListRootProps> = ({
  runtime,
  children,
  ...viewProps
}) => {
  return (
    <ThreadListProvider runtime={runtime}>
      <View {...viewProps}>{children}</View>
    </ThreadListProvider>
  );
};

import { FC, PropsWithChildren } from "react";
import { View, ViewProps } from "react-native";
import { ThreadProvider } from "../../context/ThreadContext";
import { ComposerProvider } from "../../context/ComposerContext";
import type { ThreadRuntime, ComposerRuntime } from "../../runtime/types";

export type ThreadRootProps = PropsWithChildren<
  ViewProps & {
    runtime: ThreadRuntime;
    composerRuntime?: ComposerRuntime;
  }
>;

export const ThreadRoot: FC<ThreadRootProps> = ({
  runtime,
  composerRuntime,
  children,
  ...viewProps
}) => {
  const content = composerRuntime ? (
    <ComposerProvider runtime={composerRuntime}>{children}</ComposerProvider>
  ) : (
    children
  );

  return (
    <ThreadProvider runtime={runtime}>
      <View {...viewProps}>{content}</View>
    </ThreadProvider>
  );
};

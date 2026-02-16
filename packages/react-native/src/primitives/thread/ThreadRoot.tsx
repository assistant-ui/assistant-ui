import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import type { ThreadRuntime } from "@assistant-ui/core";
import { ThreadProvider } from "../../context";
import { ComposerProvider } from "../../context";

export type ThreadRootProps = ViewProps & {
  runtime: ThreadRuntime;
  children: ReactNode;
};

export const ThreadRoot = ({
  runtime,
  children,
  ...viewProps
}: ThreadRootProps) => {
  return (
    <ThreadProvider runtime={runtime}>
      <ComposerProvider runtime={runtime.composer}>
        <View {...viewProps}>{children}</View>
      </ComposerProvider>
    </ThreadProvider>
  );
};

import { FC, PropsWithChildren } from "react";
import { View, ViewProps } from "react-native";
import { ComposerProvider } from "../../context/ComposerContext";
import type { ComposerRuntime } from "../../runtime/types";

export type ComposerRootProps = PropsWithChildren<
  ViewProps & {
    runtime?: ComposerRuntime;
  }
>;

export const ComposerRoot: FC<ComposerRootProps> = ({
  runtime,
  children,
  ...viewProps
}) => {
  const content = runtime ? (
    <ComposerProvider runtime={runtime}>{children}</ComposerProvider>
  ) : (
    children
  );

  return <View {...viewProps}>{content}</View>;
};

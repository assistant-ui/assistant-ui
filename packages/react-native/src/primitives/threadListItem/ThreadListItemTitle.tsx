import type { ReactNode } from "react";
import { Text, type TextProps } from "react-native";
import { useAuiState } from "@assistant-ui/store";

export type ThreadListItemTitleProps = Omit<TextProps, "children"> & {
  fallback?: ReactNode;
};

export function ThreadListItemTitle({
  fallback,
  ...props
}: ThreadListItemTitleProps) {
  const title = useAuiState((s) => s.threadListItem.title);
  return <Text {...props}>{title || fallback}</Text>;
}

export namespace ThreadListItemTitle {
  export type Props = ThreadListItemTitleProps;
}

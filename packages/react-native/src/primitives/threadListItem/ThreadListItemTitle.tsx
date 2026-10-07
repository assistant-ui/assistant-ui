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
  const content = title || fallback;
  if (typeof content === "string" || typeof content === "number") {
    return <Text {...props}>{content}</Text>;
  }
  return <>{content}</>;
}

export namespace ThreadListItemTitle {
  export type Props = ThreadListItemTitleProps;
}

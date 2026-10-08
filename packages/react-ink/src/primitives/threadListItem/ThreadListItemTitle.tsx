import type { ComponentProps, ReactNode } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

export type ThreadListItemTitleProps = Omit<
  ComponentProps<typeof Text>,
  "children"
> & {
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

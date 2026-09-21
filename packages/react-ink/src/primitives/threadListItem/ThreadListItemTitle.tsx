import type { ComponentProps, FC, ReactNode } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

export type ThreadListItemTitleProps = ComponentProps<typeof Text> & {
  fallback?: ReactNode;
};

export const ThreadListItemTitle: FC<ThreadListItemTitleProps> = ({
  fallback,
  ...props
}) => {
  const title = useAuiState((s) => s.threadListItem.title);
  return <Text {...props}>{title || fallback}</Text>;
};

import type { ComponentProps, ReactNode } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

export type QueueItemTextProps = ComponentProps<typeof Text> & {
  children?: ReactNode;
};

export const QueueItemText = ({
  children,
  ...textProps
}: QueueItemTextProps) => {
  const prompt = useAuiState((s) => s.queueItem.prompt);

  return <Text {...textProps}>{children ?? prompt}</Text>;
};

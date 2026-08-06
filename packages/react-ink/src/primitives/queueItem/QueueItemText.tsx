import type { ComponentProps } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

export type QueueItemTextProps = ComponentProps<typeof Text>;

export const QueueItemText = ({
  children,
  ...textProps
}: QueueItemTextProps) => {
  const text = useAuiState((s) =>
    s.queueItem.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n\n"),
  );

  return <Text {...textProps}>{children ?? text}</Text>;
};

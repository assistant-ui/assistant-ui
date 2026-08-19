import type { ReactNode } from "react";
import { Text, type TextProps } from "react-native";
import { useAuiState } from "@assistant-ui/store";

export type QueueItemTextProps = TextProps & {
  children?: ReactNode;
};

export const QueueItemText = ({
  children,
  ...textProps
}: QueueItemTextProps) => {
  const text = useAuiState((s) =>
    // hosts on the pre-parts adapter shape may omit the field at runtime
    (s.queueItem.parts ?? [])
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n\n"),
  );

  return <Text {...textProps}>{children ?? text}</Text>;
};

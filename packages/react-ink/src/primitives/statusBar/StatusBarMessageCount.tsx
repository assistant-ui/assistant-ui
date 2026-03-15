import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

const defaultFormat = (count: number) => `${count} msgs`;

export type StatusBarMessageCountProps = {
  format?: (count: number) => string;
};

export const StatusBarMessageCount = ({
  format = defaultFormat,
}: StatusBarMessageCountProps) => {
  const count = useAuiState((s) => s.thread.messages.length);

  return <Text dimColor>{format(count)}</Text>;
};

StatusBarMessageCount.displayName = "StatusBarPrimitive.MessageCount";

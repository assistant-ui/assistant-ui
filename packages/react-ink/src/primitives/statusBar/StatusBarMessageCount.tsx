import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

const defaultFormat = (count: number) => `${count} msgs`;

export type StatusBarPrimitiveMessageCountProps = {
  format?: (count: number) => string;
};

export namespace StatusBarPrimitiveMessageCount {
  export type Props = StatusBarPrimitiveMessageCountProps;
}

export const StatusBarPrimitiveMessageCount = ({
  format = defaultFormat,
}: StatusBarPrimitiveMessageCount.Props) => {
  const count = useAuiState((s) => s.thread.messages.length);

  if (count === 0) return null;

  return <Text dimColor>{format(count)}</Text>;
};

StatusBarPrimitiveMessageCount.displayName = "StatusBarPrimitive.MessageCount";

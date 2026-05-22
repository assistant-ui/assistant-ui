import type { ComponentProps } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

const defaultFormat = (count: number) => `${count} msgs`;

export type StatusBarPrimitiveMessageCountProps = Omit<
  ComponentProps<typeof Text>,
  "children"
> & {
  format?: (count: number) => string;
};

export namespace StatusBarPrimitiveMessageCount {
  export type Props = StatusBarPrimitiveMessageCountProps;
}

export const StatusBarPrimitiveMessageCount = ({
  format = defaultFormat,
  ...textProps
}: StatusBarPrimitiveMessageCount.Props) => {
  const count = useAuiState((s) => s.thread.messages.length);

  if (count === 0) return null;

  return <Text {...textProps}>{format(count)}</Text>;
};

StatusBarPrimitiveMessageCount.displayName = "StatusBarPrimitive.MessageCount";

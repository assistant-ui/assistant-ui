import type { ComponentProps } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

const defaultFormat = (tokensPerSecond: number) =>
  `${Math.round(tokensPerSecond)} tok/s`;

export type StatusBarPrimitiveLatencyProps = Omit<
  ComponentProps<typeof Text>,
  "children"
> & {
  format?: (tokensPerSecond: number) => string;
};

export namespace StatusBarPrimitiveLatency {
  export type Props = StatusBarPrimitiveLatencyProps;
}

export const StatusBarPrimitiveLatency = ({
  format = defaultFormat,
  ...textProps
}: StatusBarPrimitiveLatency.Props) => {
  const thread = useAuiState("thread");
  const lastAssistant = thread.messages.findLast((m) => m.role === "assistant");
  const tokensPerSecond = lastAssistant?.metadata?.timing?.tokensPerSecond;

  if (tokensPerSecond === undefined) return null;

  return <Text {...textProps}>{format(tokensPerSecond)}</Text>;
};

StatusBarPrimitiveLatency.displayName = "StatusBarPrimitive.Latency";

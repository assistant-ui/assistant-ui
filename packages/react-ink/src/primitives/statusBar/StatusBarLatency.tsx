import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

const defaultFormat = (tokensPerSecond: number) =>
  `${Math.round(tokensPerSecond)} tok/s`;

export type StatusBarPrimitiveLatencyProps = {
  format?: (tokensPerSecond: number) => string;
};

export namespace StatusBarPrimitiveLatency {
  export type Props = StatusBarPrimitiveLatencyProps;
}

export const StatusBarPrimitiveLatency = ({
  format = defaultFormat,
}: StatusBarPrimitiveLatency.Props) => {
  const tokensPerSecond = useAuiState((s) => {
    const lastAssistant = s.thread.messages.findLast(
      (m) => m.role === "assistant",
    );
    return lastAssistant?.metadata?.timing?.tokensPerSecond;
  });

  if (tokensPerSecond === undefined) return null;

  return <Text dimColor>{format(tokensPerSecond)}</Text>;
};

StatusBarPrimitiveLatency.displayName = "StatusBarPrimitive.Latency";

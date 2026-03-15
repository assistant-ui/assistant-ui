import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

const defaultFormat = (tokensPerSecond: number) =>
  `${Math.round(tokensPerSecond)} tok/s`;

export type StatusBarLatencyProps = {
  format?: (tokensPerSecond: number) => string;
};

export const StatusBarLatency = ({
  format = defaultFormat,
}: StatusBarLatencyProps) => {
  const tokensPerSecond = useAuiState((s) => {
    const lastAssistant = s.thread.messages.findLast(
      (m) => m.role === "assistant",
    );
    return lastAssistant?.metadata?.timing?.tokensPerSecond;
  });

  if (tokensPerSecond === undefined) return null;

  return <Text dimColor>{format(tokensPerSecond)}</Text>;
};

StatusBarLatency.displayName = "StatusBarPrimitive.Latency";

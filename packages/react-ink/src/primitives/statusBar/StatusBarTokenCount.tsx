import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

const defaultFormat = (tokens: number) => `${tokens.toLocaleString()} tokens`;

export type StatusBarTokenCountProps = {
  format?: (tokens: number) => string;
};

export const StatusBarTokenCount = ({
  format = defaultFormat,
}: StatusBarTokenCountProps) => {
  const totalTokens = useAuiState((s) =>
    s.thread.messages.reduce((sum, msg) => {
      if (msg.role !== "assistant") return sum;
      return sum + (msg.metadata?.timing?.tokenCount ?? 0);
    }, 0),
  );

  if (totalTokens === 0) return null;

  return <Text dimColor>{format(totalTokens)}</Text>;
};

StatusBarTokenCount.displayName = "StatusBarPrimitive.TokenCount";

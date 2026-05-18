import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

const defaultFormat = (tokens: number) => `${tokens.toLocaleString()} tokens`;

export type StatusBarPrimitiveTokenCountProps = {
  format?: (tokens: number) => string;
};

export namespace StatusBarPrimitiveTokenCount {
  export type Props = StatusBarPrimitiveTokenCountProps;
}

export const StatusBarPrimitiveTokenCount = ({
  format = defaultFormat,
}: StatusBarPrimitiveTokenCount.Props) => {
  const totalTokens = useAuiState((s) =>
    s.thread.messages.reduce((sum, msg) => {
      if (msg.role !== "assistant") return sum;
      return sum + (msg.metadata?.timing?.tokenCount ?? 0);
    }, 0),
  );

  if (totalTokens === 0) return null;

  return <Text dimColor>{format(totalTokens)}</Text>;
};

StatusBarPrimitiveTokenCount.displayName = "StatusBarPrimitive.TokenCount";

import type { ComponentProps } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";
import { sanitizeTerminalText } from "../../sanitizeTerminalText";

export type MessagePartPrimitiveReasoningProps = Omit<
  ComponentProps<typeof Text>,
  "children"
>;

export namespace MessagePartPrimitiveReasoning {
  export type Props = MessagePartPrimitiveReasoningProps;
}

export const MessagePartPrimitiveReasoning = (
  props: MessagePartPrimitiveReasoning.Props,
) => {
  const reasoning = useAuiState((s) => {
    if (s.part.type !== "reasoning") return "";
    return s.part.text;
  });
  return <Text {...props}>{sanitizeTerminalText(reasoning)}</Text>;
};

MessagePartPrimitiveReasoning.displayName = "MessagePartPrimitive.Reasoning";

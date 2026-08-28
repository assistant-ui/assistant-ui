import type { ComponentProps } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

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
  const reasoning = useAuiState("part", (s) => {
    if (s.type !== "reasoning") return "";
    return s.text;
  });
  return <Text {...props}>{reasoning}</Text>;
};

MessagePartPrimitiveReasoning.displayName = "MessagePartPrimitive.Reasoning";

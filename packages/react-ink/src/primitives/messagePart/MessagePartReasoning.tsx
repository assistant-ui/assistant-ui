import type { ComponentProps } from "react";
import { Text } from "ink";
import { useMessagePartReasoning } from "@assistant-ui/core/react";

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
  const { text } = useMessagePartReasoning();
  return <Text {...props}>{text}</Text>;
};

MessagePartPrimitiveReasoning.displayName = "MessagePartPrimitive.Reasoning";

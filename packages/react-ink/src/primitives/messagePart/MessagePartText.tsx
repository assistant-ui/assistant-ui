import type { ComponentProps } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

export type MessagePartPrimitiveTextProps = Omit<
  ComponentProps<typeof Text>,
  "children"
>;

export namespace MessagePartPrimitiveText {
  export type Props = MessagePartPrimitiveTextProps;
}

export const MessagePartPrimitiveText = (
  props: MessagePartPrimitiveText.Props,
) => {
  const text = useAuiState((s) => {
    if (s.part.type !== "text" && s.part.type !== "reasoning")
      throw new Error(
        "MessagePartPrimitive.Text can only be used inside text or reasoning message parts.",
      );
    return s.part.text;
  });
  return <Text {...props}>{text}</Text>;
};

MessagePartPrimitiveText.displayName = "MessagePartPrimitive.Text";
